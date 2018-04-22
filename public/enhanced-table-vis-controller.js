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

  const createFormulaParams = function (column, row, totalHits) {
    let formulaParams = { total: totalHits };
    _.forEach(column.formulaParamsCols, function (formulaParamCol) {
      formulaParams[`col${formulaParamCol}`] = row[formulaParamCol].value;
    });
    return formulaParams;
  };

  const createTemplateContext = function (column, row, totalHits) {
    let templateContext = { total: totalHits };
    if (column.copyRowForTemplate) {
      templateContext.col = _.clone(row);
    }
    _.forEach(column.templateParamsCols, function (templateParamCol) {
      templateContext[`col${templateParamCol}`] = row[templateParamCol].value;
    });
    return templateContext;
  };

  const createParser = function (computedColumn) {
    let formula = computedColumn.formula.replace(/col\[(\d+)\]/g, 'col$1');
    return Parser.parse(formula);
  };

  const createColumn = function (computedColumn, index) {
    const FieldFormat = fieldFormats.getType(computedColumn.format);
    const fieldFormatParams = computedColumn.format === 'number' ? {pattern: computedColumn.pattern} : {};
    let newColumn = {
      aggConfig: new AggConfig($scope.vis, {schema: 'metric', type: 'count'}),
      title: computedColumn.label,
      fieldFormatter: new FieldFormat(fieldFormatParams, getConfig),
      alignment: computedColumn.alignment,
      formulaParamsCols: [],
      templateParamsCols: []
    };
    newColumn.aggConfig.id = `1.computed-column-${index}`;
    newColumn.aggConfig.key = `computed-column-${index}`;
    let colArrayRegex = /col\[?(\d+)\]?/g;
    let regexMatch;
    while ((regexMatch = colArrayRegex.exec(computedColumn.formula)) !== null) {
      newColumn.formulaParamsCols.push(regexMatch[1]);
    }
    if (computedColumn.applyTemplate && computedColumn.template !== undefined) {
      newColumn.template = handlebars.compile(computedColumn.template);
      newColumn.copyRowForTemplate = (computedColumn.template.indexOf('{{col.') != -1);
      while ((regexMatch = colArrayRegex.exec(computedColumn.template)) !== null) {
        newColumn.templateParamsCols.push(regexMatch[1]);
      }
    }
    return newColumn;
  };

  const renderCell = function (contentType) {
    let result = this.column.fieldFormatter.convert(this.value);
    if (this.column.template !== undefined) {
      this.templateContext.value = result;
      result = this.column.template(this.templateContext);
    }
    if (this.column.alignment !== undefined && this.column.alignment !== 'left') {
      result = `<div align="${this.column.alignment}">${result}</div>`;
    }
    if (contentType !== 'html') {
      result = result.replace(/<(?:.|\n)*?>/gm, '');
    }
    return result;
  };

  const createComputedCells = function (column, rows, computedColumn, parser, totalHits) {
    _.forEach(rows, function (row) {
      let formulaParams = createFormulaParams(column, row, totalHits);
      let value = parser.evaluate(formulaParams);
      let parent = row.length > 0 && row[row.length-1];
      let newCell = new AggConfigResult(column.aggConfig, parent, value, value);
      newCell.column = column;
      if (column.template !== undefined) {
        newCell.templateContext = createTemplateContext(column, row, totalHits);
      }
      newCell.toString = renderCell;
      row.push(newCell);
    });
  };

  const createTables = function (tables, computedColumn, index, parser, newColumn, totalHits) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        createTables(table.tables, computedColumn, index, parser, newColumn, totalHits);
        return;
      }

      table.columns.push(newColumn);
      createComputedCells(newColumn, table.rows, computedColumn, parser, totalHits);
    });
  };

  const hideColumns = function (tables, hiddenColumns) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        hideColumns(table.tables, hiddenColumns);
        return;
      }

      let removedCounter = 0;
      _.forEach(hiddenColumns, function (item) {
        let index = item * 1;
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

  const splitCols = function (table, splitColIndex) {
    if (table.tables) {
      _.forEach(table.tables, function (table) {
        splitCols(table, splitColIndex);
      });
      return;
    }

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
          let newColDefaultMetric = new AggConfigResult(row[i].aggConfig, null, DEFAULT_METRIC_VALUE, DEFAULT_METRIC_VALUE, row[i].filters);
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

    // add new column headers
    let newCols = [];
    for (let i = 0; i < splitColIndex; i++) {
      newCols.push(table.columns[i]);
    }
    _.forEach(newColNamePrefixes, function(newColNamePrefix) {
      for (let i = splitColIndex + 1; i < table.columns.length; i++) {
        let newCol = _.clone(table.columns[i]);
        newCol.title = metricsCount > 1 ? newColNamePrefix + ' - ' + newCol.title : newColNamePrefix;
        newCols.push(newCol);
      }
    });
    table.columns = newCols;
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
    return !$scope.filterBarHideable || $scope.filterInputEnabled;
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

      // create tableGroups
      tableGroups = tabifyAggResponse(vis, esResponse, {
        partialRows: params.showPartialRows,
        minimalColumns: vis.isHierarchical() && !params.showMeticsAtAllLevels,
        asAggConfigResults: true
      });

      // process 'Split Cols' bucket: transform rows to cols
      const firstTable = findFirstDataTable(tableGroups);
      const splitColIndex = firstTable !== null ? _.findIndex(firstTable.columns, col => col.aggConfig.schema.name === 'splitcols') : -1;
      if (splitColIndex != -1) {
        const lastBucketIndex = _.findLastIndex(firstTable.columns, col => col.aggConfig.schema.group === 'buckets');
        // check that 'Split Cols' is the last bucket
        if (splitColIndex !== lastBucketIndex) {
          if ($scope.splitColsBucketError === undefined) {
            $scope.splitColsBucketError = true;
            notifier.error(`'Split Cols' bucket must be the last one`);
          }
          else {
            $scope.splitColsBucketError = undefined;
          }
          return;
        }
        splitCols(tableGroups, splitColIndex);
      }

      // add computed columns
      _.forEach(params.computedColumns, function (computedColumn, index) {
        if (computedColumn.enabled) {
          let parser = createParser(computedColumn);
          let newColumn = createColumn(computedColumn, index);
          createTables(tableGroups.tables, computedColumn, index, parser, newColumn, esResponse.hits.total);
        }
      });

      // remove hidden columns
      if (params.hiddenColumns) {
        hideColumns(tableGroups.tables, params.hiddenColumns.split(','));
      }

      // add filter bar
      if ($scope.vis.filterInput === undefined) {
        $scope.vis.filterInput = $scope.activeFilter;
      }
      if (params.showFilterBar && $scope.showFilterInput() && $scope.activeFilter !== undefined && $scope.activeFilter !== '') {
        tableGroups.tables = filterTableRows(tableGroups.tables, $scope.activeFilter, params.filterCaseSensitive);
      }
      $scope.showFilterBar = params.showFilterBar;
      $scope.filterBarWidth = params.filterBarWidth;
      $scope.filterBarHideable = params.filterBarHideable;

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
