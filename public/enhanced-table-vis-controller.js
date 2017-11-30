import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import AggConfigResult from 'ui/vis/agg_config_result';
import { Parser } from 'expr-eval';
import numeral from 'numeral';

const module = uiModules.get('kibana/enhanced-table', ['kibana']);
module.controller('EnhancedTableVisController', function ($scope, $element, Private) {

  const tabifyAggResponse = Private(AggResponseTabifyProvider);
  const AggConfig = Private(VisAggConfigProvider);

  // controller methods
  const createExpressionsParams = function (formula, row) {
    let regex = /col\[(\d+)\]/g;
    let myArray, colIndex, colValue;
    let output = {};
    while ((myArray = regex.exec(formula)) !== null) {
      colIndex = myArray[1];
      colValue = row[colIndex].value;
      output[`x${colIndex}`] = (typeof colValue === 'number') ? numeral(colValue).value() : colValue;
    }
    return output;
  };

  const createParser = function (computedColumn) {
    let expression = computedColumn.formula.replace(/col\[(\d+)\]/g, 'x$1');
    return Parser.parse(expression);
  };

  const createColumn = function (computedColumn, index) {
    let newColumn = {aggConfig: new AggConfig($scope.vis, {schema: 'metric', type: 'count'}), title: computedColumn.label};
    newColumn.aggConfig.id = `1.computed-column-${index}`;
    newColumn.aggConfig.key = `computed-column-${index}`;
    return newColumn;
  };

  const createRows = function (column, rows, computedColumn, parser) {
    return _.map(rows, function (row) {
      let expressionParams = createExpressionsParams(computedColumn.formula, row);
      let value = parser.evaluate(expressionParams);
      let newCell = new AggConfigResult(column.aggConfig, void 0, value, value);
      newCell.toString = function () {
        return (typeof value === 'number') ? numeral(value).format(computedColumn.format) : value;
      };
      row.push(newCell);
      return row;
    });
  };

  const createTables = function (tables, computedColumn, index, parser, newColumn) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        createTables(table.tables, computedColumn, index, parser, newColumn);
        return;
      }

      table.columns.push(newColumn);
      table.rows = createRows(newColumn, table.rows, computedColumn, parser);
    });
  };

  const hideColumns = function (tables, hiddenColumns) {
    let removedCounter = 0;
    _.forEach(tables, function (table) {
      if (table.tables) {
        hideColumns(table.tables, hiddenColumns);
        return;
      }

      _.forEach(hiddenColumns, function (item) {
        let index = item * 1;
        table.columns.splice(index - removedCounter, 1);
        _.forEach(table.rows, function (row) {
          row.splice(index - removedCounter, 1);
        });
      });
      removedCounter++;
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
            let key = col.key;
            if (typeof key === 'string') {
              if (!filterCaseSensitive) {
                key = key.toLowerCase();
              }
              return key.includes(activeFilter);
            }
            return false;
          });
        });
        return table.rows.length > 0;
      }
    });
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
    return !$scope.vis.params.filterBarHideable || $scope.filterInputEnabled;
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
   * - the underlying data changes (esResponse)
   * - one of the view options changes (vis.params)
   * - user submits a new filter to apply on results (activeFilter)
   */
  $scope.$watchMulti(['esResponse', 'vis.params', 'activeFilter'], function ([resp]) {

    let tableGroups = $scope.tableGroups = null;
    let hasSomeRows = $scope.hasSomeRows = null;

    if (resp) {
      const vis = $scope.vis;
      const params = vis.params;

      // compute tableGroups
      tableGroups = tabifyAggResponse(vis, resp, {
        partialRows: params.showPartialRows,
        minimalColumns: vis.isHierarchical() && !params.showMeticsAtAllLevels,
        asAggConfigResults: true
      });

      // manage computed columns
      _.forEach(params.computedColumns, function (computedColumn, index) {
        if (computedColumn.enabled) {
          let parser = createParser(computedColumn);
          let newColumn = createColumn(computedColumn, index);
          createTables(tableGroups.tables, computedColumn, index, parser, newColumn);
        }
      });

      // manage hidden columns
      if (params.hiddenColumns) {
        hideColumns(tableGroups.tables, params.hiddenColumns.split(','));
      }

      // manage filter bar
      if (params.showFilterBar && $scope.showFilterInput() && $scope.activeFilter !== '') {
        tableGroups.tables = filterTableRows(tableGroups.tables, $scope.activeFilter, params.filterCaseSensitive);
      }

      // check if there are rows to display
      hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) {
          return table.tables.some(haveRows);
        }
        return table.rows.length > 0;
      });

      // optimize space under table
      const showPagination = hasSomeRows && params.perPage && shouldShowPagination(tableGroups.tables, params.perPage);
      $scope.tableVisContainerClass = {
        'hide-pagination': !showPagination,
        'hide-export-links': params.hideExportLinks
      };

      $element.trigger('renderComplete');
    }

    $scope.hasSomeRows = hasSomeRows;
    if (hasSomeRows) {
      $scope.tableGroups = tableGroups;
    }
  });
});

