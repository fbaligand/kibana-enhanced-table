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
   */
  $scope.$watchMulti(['esResponse', 'vis.params'], function ([resp]) {

    let tableGroups = $scope.tableGroups = null;
    let hasSomeRows = $scope.hasSomeRows = null;

    let computedColumns = $scope.vis.params.computedColumns;
    let hiddenColumns = $scope.vis.params.hiddenColumns;

    if (resp) {
      const vis = $scope.vis;
      const params = vis.params;

      tableGroups = tabifyAggResponse(vis, resp, {
        partialRows: params.showPartialRows,
        minimalColumns: vis.isHierarchical() && !params.showMeticsAtAllLevels,
        asAggConfigResults: true
      });

      _.forEach(computedColumns, function (computedColumn, index) {
        if (computedColumn.enabled) {
          let parser = createParser(computedColumn);
          let newColumn = createColumn(computedColumn, index);
          createTables(tableGroups.tables, computedColumn, index, parser, newColumn);
    	}
      });

      if (hiddenColumns) {
        hideColumns(tableGroups.tables, hiddenColumns.split(','));
      }

      hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) {
          return table.tables.some(haveRows);
        }
        return table.rows.length > 0;
      });

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

