import { uiModules } from 'ui/modules';
import _ from 'lodash';

import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
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

  const tabifyAggResponse = Private(AggResponseTabifyProvider);
  const AggConfig = Private(VisAggConfigProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);
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
    if (splitColIndex !== -1 && colIndex >= splitColIndex) {
      return colIndex + 1;
    }
    else {
      return colIndex;
    }
  };

  const createFormula = function (computedColumn, splitColIndex) {

    // convert old col[i] syntax
    const colRefRegex = /col(\d+)/g;
    const realFormula = computedColumn.formula.replace(/col\[(\d+)\]/g, 'col$1')
                                              .replace(colRefRegex, (match, colIndex) => 'col' + getRealColIndex(parseInt(colIndex), splitColIndex));

    // add formula param cols
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

  const createFormulaParams = function (column, row, totalHits) {
    let formulaParams = { total: totalHits };
    _.forEach(column.formula.paramsCols, function (formulaParamCol) {
      formulaParams[`col${formulaParamCol}`] = row[formulaParamCol].value;
    });
    return formulaParams;
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
      formula: createFormula(computedColumn, splitColIndex),
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
    let formulaParams = createFormulaParams(column, row, totalHits);
    let value = column.formula.parser.evaluate(formulaParams);
    let parent = row.length > 0 && row[row.length-1];
    let newCell = new AggConfigResult(column.aggConfig, parent, value, value);
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

  const filterTableRows = function (tables, activeFilter, filterCaseSensitive) {
    return _.filter(tables, function (table) {
      if (table.tables) {
        table.tables = filterTableRows(table.tables, activeFilter, filterCaseSensitive);
        return table.tables.length > 0;
      }
      else {
        if (!filterCaseSensitive) {
          activeFilter = activeFilter.toLowerCase();
        }
        table.rows = _.filter(table.rows, function (row) {
          return row.some(function (col) {
            let colValue = col.toString();
            if (typeof colValue === 'string') {
              if (!filterCaseSensitive) {
                colValue = colValue.toLowerCase();
              }
              return colValue.includes(activeFilter);
            }
            return false;
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

    // process only real tables
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

      // create a new row
      if (newRow === null || (splitColIndex > 0 && row[splitColIndex-1].value != newRow[splitColIndex-1].value)) {
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


  /**
   * Recreate the entire table when:
   * - table 'renderComplete' event (renderComplete)
   * - user submits a new filter to apply on results (activeFilter)
   */
  $scope.$watchMulti(['renderComplete', 'activeFilter'], function watchMulti() {

    let tableGroups = $scope.tableGroups = null;
    let hasSomeRows = $scope.hasSomeRows = null;
    let esResponse = $scope.esResponse;

    if (esResponse) {
      const vis = $scope.vis;
      const params = vis.params;
      const totalHits = esResponse.hits.total;

      // create tableGroups
      tableGroups = tabifyAggResponse(vis, esResponse, {
        partialRows: params.showPartialRows,
        minimalColumns: vis.isHierarchical() && !params.showMeticsAtAllLevels,
        asAggConfigResults: true
      });

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

      // add computed columns
      _.forEach(params.computedColumns, function (computedColumn, index) {
        if (computedColumn.enabled) {
          let newColumn = createColumn(computedColumn, index, totalHits, splitColIndex);
          addComputedColumnToTables(tableGroups.tables, index, newColumn, totalHits);
        }
      });

      // remove hidden columns
      if (params.hiddenColumns) {
        hideColumns(tableGroups.tables, params.hiddenColumns.split(','), splitColIndex);
      }

      // process 'Split Cols' bucket: transform rows to cols
      splitColIndex = findSplitColIndex(firstTable);
      if (splitColIndex != -1) {
        splitCols(tableGroups, splitColIndex, totalHits);
      }

      // add filter bar
      if ($scope.vis.filterInput === undefined) {
        $scope.vis.filterInput = $scope.activeFilter;
      }
      if (params.showFilterBar && $scope.showFilterInput() && $scope.activeFilter !== undefined && $scope.activeFilter !== '') {
        tableGroups.tables = filterTableRows(tableGroups.tables, $scope.activeFilter, params.filterCaseSensitive);
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

      // check if there are rows to display
      hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) return table.tables.some(haveRows);
        return table.rows.length > 0;
      });

      // optimize space under table
      const showPagination = hasSomeRows && params.perPage && shouldShowPagination(tableGroups.tables, params.perPage);
      $scope.tableVisContainerClass = {
        'hide-pagination': !showPagination,
        'hide-export-links': params.hideExportLinks
      };
    }

    $scope.hasSomeRows = hasSomeRows;
    if (hasSomeRows) {
      $scope.tableGroups = tableGroups;
    }
    $scope.renderComplete();
  });
});
