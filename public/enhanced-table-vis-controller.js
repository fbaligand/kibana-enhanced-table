import { uiModules } from 'ui/modules';
import _ from 'lodash';

import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';
import { fieldFormats } from 'ui/registry/field_formats';
import { AggConfig } from 'ui/vis/agg_config';
import AggConfigResult from 'ui/vis/agg_config_result';
import { Notifier } from 'ui/notify/notifier';

// third-party dependencies
import { Parser } from 'expr-eval';
import handlebars from 'handlebars/dist/handlebars';

// get the kibana/enhanced-table module, and make sure that it requires the "kibana" module if it didn't already
const module = uiModules.get('kibana/enhanced-table', ['kibana']);

// add a controller to tha module, which will transform the esResponse into a
// tabular format that we can pass to the table directive
module.controller('EnhancedTableVisController', function ($scope, Private, config) {

  const getConfig = (...args) => config.get(...args);
  const notifier = new Notifier();

  // controller methods

  const createTemplateContext = function (column, row, totalHits) {
    let templateContext = { total: totalHits };
    _.forEach(column.template.paramsCols, function (templateParamCol) {
      templateContext[`col${templateParamCol}`] = row[templateParamCol].value;
    });
    return templateContext;
  };

  const findSplitColIndex = function (table) {
    if (table !== null) {
      return _.findIndex(table.columns, col => col.aggConfig.schema.name === 'splitcols');
    }
    else {
      return -1;
    }
  };

  const getRealColIndex = function (colIndex, splitColIndex) {
    if (splitColIndex !== -1 && colIndex >= splitColIndex && $scope.vis.params.computedColsPerSplitCol) {
      return colIndex + 1;
    }
    else {
      return colIndex;
    }
  };

  const createFormula = function (inputFormula, splitColIndex) {

    // convert old col[i] syntax
    const colRefRegex = /col(\d+)/g;
    const realFormula = inputFormula.replace(/col\[(\d+)\]/g, 'col$1')
                                    .replace(colRefRegex, (match, colIndex) => 'col' + getRealColIndex(parseInt(colIndex), splitColIndex));

    // extract formula param cols
    const formulaParamsCols = [];
    let regexMatch;
    while ((regexMatch = colRefRegex.exec(realFormula)) !== null) {
      let colIndex = parseInt(regexMatch[1]);
      formulaParamsCols.push(colIndex);
    }

    // return final formula object
    return {
      parser: Parser.parse(realFormula),
      paramsCols: formulaParamsCols
    };
  };

  const computeFormulaValue = function (formula, row, totalHits) {
    const formulaParams = { total: totalHits };
    _.forEach(formula.paramsCols, function (formulaParamCol) {
      formulaParams[`col${formulaParamCol}`] = row[formulaParamCol].value;
    });
    const value = formula.parser.evaluate(formulaParams);
    return value;
  };

  const createTemplate = function (computedColumn, splitColIndex) {

    if (!computedColumn.applyTemplate) {
      return undefined;
    }

    // convert old col.i.value syntax and manage 'split cols' case
    const colRefRegex = /\{\{\s*col(\d+)/g;
    const realTemplate = computedColumn.template.replace(/\{\{\s*col\.(\d+)\.value/g, '{{col$1')
                                                .replace(colRefRegex, (match, colIndex) => '{{col' + getRealColIndex(parseInt(colIndex), splitColIndex));

    // add template param cols
    const templateParamsCols = [];
    let regexMatch;
    while ((regexMatch = colRefRegex.exec(realTemplate)) !== null) {
      let colIndex = parseInt(regexMatch[1]);
      templateParamsCols.push(colIndex);
    }

    // return final template object
    return {
      compiledTemplate: handlebars.compile(realTemplate),
      paramsCols: templateParamsCols
    };
  };

  /** create a new data table column for specified computed column */
  const createColumn = function (computedColumn, index, totalHits, splitColIndex) {

    const FieldFormat = fieldFormats.getType(computedColumn.format);
    const fieldFormatParams = (computedColumn.format === 'number') ? {pattern: computedColumn.pattern} : {};
    const aggSchema = (computedColumn.format === 'number') ? 'metric' : 'bucket';
    const aggType = (computedColumn.format === 'number') ? 'count' : 'filter';

    // create new column object
    let newColumn = {
      aggConfig: new AggConfig($scope.vis, {schema: aggSchema, type: aggType}),
      title: computedColumn.label,
      fieldFormatter: new FieldFormat(fieldFormatParams, getConfig),
      dataAlignmentClass: `text-${computedColumn.alignment}`,
      formula: createFormula(computedColumn.formula, splitColIndex),
      template: createTemplate(computedColumn, splitColIndex)
    };
    newColumn.aggConfig.id = `1.computed-column-${index}`;
    newColumn.aggConfig.key = `computed-column-${index}`;

    // add alignment options
    if (computedColumn.applyAlignmentOnTotal) {
      newColumn.totalAlignmentClass = newColumn.dataAlignmentClass;
    }
    if (computedColumn.applyAlignmentOnTitle) {
      newColumn.titleAlignmentClass = newColumn.dataAlignmentClass;
    }

    // add "total" formatter function
    newColumn.aggConfig.fieldFormatter = function (contentType) {
      return function (value) {
        const self = { value: value, column: newColumn };
        if (computedColumn.applyTemplate && computedColumn.applyTemplateOnTotal) {
          self.templateContext = { total: totalHits };
        }
        return renderCell.call(self, contentType);
      };
    };

    return newColumn;
  };

  const renderCell = function (contentType) {
    let result = this.column.fieldFormatter.convert(this.value);
    if (this.templateContext !== undefined) {
      this.templateContext.value = result;
      result = this.column.template.compiledTemplate(this.templateContext);
    }
    if (contentType !== 'html') {
      result = result.replace(/<(?:.|\n)*?>/gm, '');
    }
    else {
      result = { 'markup': result, 'class': this.column.dataAlignmentClass };
    }
    return result;
  };

  const createComputedCell = function (column, row, totalHits) {
    const value = computeFormulaValue(column.formula, row, totalHits);
    const parent = row.length > 0 && row[row.length-1];
    const newCell = new AggConfigResult(column.aggConfig, parent, value, value);
    newCell.column = column;
    if (column.template !== undefined) {
      newCell.templateContext = createTemplateContext(column, row, totalHits);
    }
    newCell.toString = renderCell;
    return newCell;
  };

  const addComputedColumnToTables = function (tables, index, newColumn, totalHits) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        addComputedColumnToTables(table.tables, index, newColumn, totalHits);
        return;
      }

      table.columns.push(newColumn);
      _.forEach(table.rows, function (row) {
        row.push(createComputedCell(newColumn, row, totalHits));
      });
    });
  };

  const processLinesComputedFilter = function (tables, linesComputedFilterFormula, totalHits) {
    return _.filter(tables, function (table) {
      if (table.tables) {
        table.tables = processLinesComputedFilter(table.tables, linesComputedFilterFormula, totalHits);
        return table.tables.length > 0;
      }

      table.rows = _.filter(table.rows, function (row) {
        return computeFormulaValue(linesComputedFilterFormula, row, totalHits);
      });
      return table.rows.length > 0;
    });
  };

  const hideColumns = function (tables, hiddenColumns, splitColIndex) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        hideColumns(table.tables, hiddenColumns, splitColIndex);
        return;
      }

      if (splitColIndex !== -1 && table.rows.length > 0) {
        table.refRowWithHiddenCols = _.clone(table.rows[0]);
      }

      let removedCounter = 0;
      _.forEach(hiddenColumns, function (item) {
        let index = getRealColIndex(parseInt(item), splitColIndex);
        table.columns.splice(index - removedCounter, 1);
        _.forEach(table.rows, function (row) {
          row.splice(index - removedCounter, 1);
        });
        removedCounter++;
      });
    });
  };

  const shouldShowPagination = function (tables, perPage) {
    return tables.some(function (table) {
      if (table.tables) {
        return shouldShowPagination(table.tables, perPage);
      }
      else {
        return table.rows.length > perPage;
      }
    });
  };

  const rowContainsFilterTerm = function (row, termToFind, filterCaseSensitive) {
    return row.some(function (col) {
      let colValue = col.toString();
      if (typeof colValue === 'string') {
        if (!filterCaseSensitive) {
          colValue = colValue.toLowerCase();
        }
        return colValue.includes(termToFind);
      }
      return false;
    });
  }

  const filterTableRows = function (tables, activeFilterTerms, filterCaseSensitive) {
    const filteredTables = _.map(tables, function (table) {
      const clonedTable = _.clone(table);
      clonedTable.aggConfig = table.aggConfig;
      clonedTable.title = table.title;
      return clonedTable;
    });
    return _.filter(filteredTables, function (table) {
      if (table.tables) {
        table.tables = filterTableRows(table.tables, activeFilterTerms, filterCaseSensitive);
        return table.tables.length > 0;
      }
      else {
        table.rows = _.filter(table.rows, function (row) {
          return activeFilterTerms.every(function (filterTerm) {
            return rowContainsFilterTerm(row, filterTerm, filterCaseSensitive);
          });
        });
        return table.rows.length > 0;
      }
    });
  };

  const findFirstDataTable = function (table) {
    if (table.tables) {
      if (table.tables.length > 0) {
        return findFirstDataTable(table.tables[0]);
      }
      else {
        return null;
      }
    }
    else {
      return table;
    }
  };

  const DEFAULT_METRIC_VALUE = 0;

  const splitCols = function (table, splitColIndex, totalHits) {

    // process only real tables (with rows)
    if (table.tables) {
      _.forEach(table.tables, function (table) {
        splitCols(table, splitColIndex, totalHits);
      });
      return;
    }

    // define ref row for computed columns
    const refRowForComputedColumn = (table.refRowWithHiddenCols !== undefined) ? table.refRowWithHiddenCols : _.clone(table.rows[0]);
    for (let i = 0; i < refRowForComputedColumn.length; i++) {
      let cell = refRowForComputedColumn[i];
      if (cell.column !== undefined) {
        refRowForComputedColumn[i] = createComputedCell(cell.column, refRowForComputedColumn, totalHits);
      }
      else if (cell.type === 'metric') {
        refRowForComputedColumn[i] = new AggConfigResult(cell.aggConfig, null, DEFAULT_METRIC_VALUE, DEFAULT_METRIC_VALUE, cell.filters);
      }
    }

    // initialize new column headers
    let newCols = [];
    for (let i = 0; i < splitColIndex; i++) {
      newCols.push(table.columns[i]);
    }

    // compute new table rows
    let newRows = [];
    let newRow = null;
    let newColNamePrefixes = [];
    let newColDefaultMetrics = [];
    const metricsCount = table.columns.length - 1 - splitColIndex;

    _.forEach(table.rows, function (row) {

      // detect if we should create a row
      let createNewRow = (newRow === null);
      if (!createNewRow) {
        for (let i = 0; i < splitColIndex; i++) {
          if (row[i].value !== newRow[i].value) {
            createNewRow = true;
            break;
          }
        }
      }

      // create a new row
      if (createNewRow) {
        newRow = [];
        for (let i = 0; i < splitColIndex; i++) {
          newRow.push(row[i]);
        }
        newRows.push(newRow);
      }

      // split col
      let rowSplitColValue = row[splitColIndex].toString();
      let newColIndex = _.indexOf(newColNamePrefixes, rowSplitColValue);

      // create new col
      if (newColIndex === -1) {
        newColNamePrefixes.push(rowSplitColValue);
        newColIndex = newColNamePrefixes.length - 1;
        for (let i = splitColIndex+1; i < row.length; i++) {
          let newCol = _.clone(table.columns[i]);
          newCol.title = metricsCount > 1 ? rowSplitColValue + ' - ' + newCol.title : rowSplitColValue;
          newCols.push(newCol);
          let newColDefaultMetric;
          if (newCol.formula === undefined) {
            newColDefaultMetric = new AggConfigResult(row[i].aggConfig, null, DEFAULT_METRIC_VALUE, DEFAULT_METRIC_VALUE, row[i].filters);
          }
          else {
            newColDefaultMetric = createComputedCell(newCol, refRowForComputedColumn, totalHits);
          }
          newColDefaultMetrics.push(newColDefaultMetric);
          for (let j = 0; j < newRows.length - 1; j++) {
            newRows[j].push(newColDefaultMetric);
          }
        }
      }

      // add new col metrics
      for (let i = 0; i < metricsCount; i++) {
        newRow[splitColIndex + (newColIndex * metricsCount) + i] = row[splitColIndex + 1 + i];
      }
      for (let i = 0; i < newColDefaultMetrics.length; i++) {
        let targetCol = splitColIndex + i;
        if (newRow[targetCol] === undefined) {
          newRow[targetCol] = newColDefaultMetrics[i];
        }
      }
    });

    // update rows
    table.rows = newRows;

    // update cols
    table.columns = newCols;
  };

  const notifyError = function(errorMessage) {
    if ($scope.errorMessageNotified === undefined) {
      notifier.error(errorMessage);
      $scope.errorMessageNotified = true;
    }
    else {
      $scope.errorMessageNotified = undefined;
    }
  };

  const colToStringWithHighlightResults = function(initialToString, scope, contentType) {
    let result = initialToString.call(this, contentType);
    if ($scope.filterHighlightRegex !== null && contentType === 'html') {
      if (typeof result === 'string') {
        result = { 'markup': result};
      }
      if (result.markup.indexOf('<span') === -1) {
        result.markup = `<span>${result.markup}</span>`;
      }
      result.markup = result.markup.replace(/>([^<>]+)</g, function (match, group) {
        return '>' + group.replace($scope.filterHighlightRegex, '<mark>$1</mark>') + '<';
      });
    }
    return result;
  };

  // filter scope methods
  $scope.doFilter = function () {
    $scope.activeFilter = $scope.vis.filterInput;
  };

  $scope.enableFilterInput = function () {
    $scope.filterInputEnabled = true;
  };

  $scope.disableFilterInput = function () {
    $scope.filterInputEnabled = false;
    $scope.activeFilter = $scope.vis.filterInput = '';
  };

  $scope.showFilterInput = function () {
    return !$scope.visState.params.filterBarHideable || $scope.filterInputEnabled;
  };

  // init controller state
  $scope.activeFilter = $scope.vis.filterInput = '';

  const uiStateSort = ($scope.uiState) ? $scope.uiState.get('vis.params.sort') : {};
  _.assign($scope.vis.params.sort, uiStateSort);

  $scope.sort = $scope.vis.params.sort;
  $scope.$watchCollection('sort', function (newSort) {
    $scope.uiState.set('vis.params.sort', newSort);
  });


  /** process filter submitted by user and refresh displayed table */
  const processFilterBarAndRefreshTable = function() {

    if ($scope.tableGroups !== undefined) {
      let tableGroups = $scope.esResponse;
      const vis = $scope.vis;
      const params = vis.params;

      // init filterInput & filterHighlightRegex
      if ($scope.vis.filterInput === undefined) {
        $scope.vis.filterInput = $scope.activeFilter;
      }
      $scope.filterHighlightRegex = null;

      // process filter bar
      if (params.showFilterBar && $scope.showFilterInput() && $scope.activeFilter !== undefined && $scope.activeFilter !== '') {

        // compute activeFilterTerms
        const activeFilter = params.filterCaseSensitive ? $scope.activeFilter : $scope.activeFilter.toLowerCase();
        let activeFilterTerms = [ activeFilter ];
        if (params.filterTermsSeparately) {
          activeFilterTerms = activeFilter.replace(/ +/g, ' ').split(' ');
        }

        // compute filterHighlightRegex
        if (params.filterHighlightResults) {
          const filterHighlightRegexString = '(' + _.sortBy(activeFilterTerms, term => term.length * -1).map(term => _.escapeRegExp(term)).join('|') + ')';
          $scope.filterHighlightRegex = new RegExp(filterHighlightRegexString, 'g' + (!params.filterCaseSensitive ? 'i' : ''));
        }

        // filter table rows to display
        tableGroups = _.clone(tableGroups);
        tableGroups.tables = filterTableRows(tableGroups.tables, activeFilterTerms, params.filterCaseSensitive);
      }

      // check if there are rows to display
      const hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) return table.tables.some(haveRows);
        return table.rows.length > 0;
      });

      // optimize space under table
      const showPagination = hasSomeRows && params.perPage && shouldShowPagination(tableGroups.tables, params.perPage);
      $scope.tableVisContainerClass = {
        'hide-pagination': !showPagination,
        'hide-export-links': params.hideExportLinks
      };

      // update $scope
      $scope.hasSomeRows = hasSomeRows;
      if (hasSomeRows) {
        $scope.tableGroups = tableGroups;
      }

      // force render if 'Highlight results' is enabled
      if (hasSomeRows && $scope.filterHighlightRegex !== null) {
        tableGroups.tables.some(function cloneFirstRow(table) {
          if (table.tables) return table.tables.some(cloneFirstRow);
          if (table.rows.length > 0) {
            table.rows[0] = _.clone(table.rows[0]);
            return true;
          }
          return false;
        });
      }
    }

  };

  // listen activeFilter field changes, to filter results
  $scope.$watch('activeFilter', processFilterBarAndRefreshTable);


  /**
   * Recreate the entire table when:
   * - the underlying data changes (esResponse)
   * - one of the view options changes (vis.params)
   */
  $scope.$watch('renderComplete', function watchRenderComplete() {

    if ($scope.esResponse && !$scope.esResponse.enhanced) {

      // init tableGroups
      $scope.tableGroups = null;
      $scope.hasSomeRows = null;
      let tableGroups = $scope.esResponse;
      const totalHits = tableGroups.totalHits;
      tableGroups.enhanced = true;
      const params = $scope.vis.params;

      // validate that 'Split Cols' is the last bucket
      const firstTable = findFirstDataTable(tableGroups);
      let splitColIndex = findSplitColIndex(firstTable);
      if (splitColIndex != -1) {
        const lastBucketIndex = _.findLastIndex(firstTable.columns, col => col.aggConfig.schema.group === 'buckets');
        if (splitColIndex !== lastBucketIndex) {
          notifyError(`'Split Cols' bucket must be the last one`);
          return;
        }
      }

      // no data to display
      if (totalHits === 0) {
        $scope.hasSomeRows = false;
        return;
      }

      // process 'Split Cols' bucket: transform rows to cols
      if (splitColIndex != -1 && !params.computedColsPerSplitCol) {
        splitCols(tableGroups, splitColIndex, totalHits);
      }

      // add computed columns
      _.forEach(params.computedColumns, function (computedColumn, index) {
        if (computedColumn.enabled) {
          let newColumn = createColumn(computedColumn, index, totalHits, splitColIndex);
          addComputedColumnToTables(tableGroups.tables, index, newColumn, totalHits);
        }
      });

      // process lines computed filter
      if (params.linesComputedFilter) {
        const linesComputedFilterFormula = createFormula(params.linesComputedFilter, splitColIndex);
        tableGroups.tables = processLinesComputedFilter(tableGroups.tables, linesComputedFilterFormula, totalHits);
      }

      // remove hidden columns
      if (params.hiddenColumns) {
        hideColumns(tableGroups.tables, params.hiddenColumns.split(','), splitColIndex);
      }

      // process 'Split Cols' bucket: transform rows to cols
      if (splitColIndex != -1 && params.computedColsPerSplitCol) {
        splitColIndex = findSplitColIndex(firstTable);
        splitCols(tableGroups, splitColIndex, totalHits);
      }

      // add total label
      if (params.showTotal && params.totalLabel !== '') {
        tableGroups.tables.forEach(function setTotalLabel(table) {
          if (table.tables)
            table.tables.forEach(setTotalLabel);
          else
            table.totalLabel = params.totalLabel;
        });
      }

      // prepare filter highlight results rendering
      if (params.showFilterBar && params.filterHighlightResults) {
        tableGroups.tables.forEach(function redefineColToString(table) {
          if (table.tables) {
            table.tables.forEach(redefineColToString);
          }
          else {
            table.rows.forEach(function(row) {
              row.forEach(function (col) {
                col.toString = colToStringWithHighlightResults.bind(col, col.toString, $scope);
              });
            });
          }
        });
      }

      // process filter bar
      processFilterBarAndRefreshTable();
    }

    $scope.renderComplete();
  });
});
