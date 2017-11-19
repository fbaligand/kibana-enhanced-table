import _ from 'lodash';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import AggConfigResult from 'ui/vis/agg_config_result';
import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import { uiModules } from 'ui/modules';
import { Parser } from 'expr-eval';
import numeral from 'numeral';

const module = uiModules.get('kibana/enhanced-table', ['kibana']);
module.controller('EnhancedTableVisController', ($scope, $element, Private) => {

  const tabifyAggResponse = Private(AggResponseTabifyProvider);
  const AggConfig = Private(VisAggConfigProvider);

  const uiStateSort = ($scope.uiState) ? $scope.uiState.get('vis.params.sort') : {};
  _.assign($scope.vis.params.sort, uiStateSort);

  const createExpressionsParams = (formula, row) => {
    let regex = /col\[(\d+)\]/g;
    let myArray;
    let output = {};
    while ((myArray = regex.exec(formula)) !== null) {
      output[`x${myArray[1]}`] = (typeof row[myArray[1]].value === 'number') ?
        numeral(row[myArray[1]].value).value() : row[myArray[1]].value;
    }
    return output;
  };

  const createParser = (computedColumn) => {
    let expression = computedColumn.formula.replace(/col\[\d+\]/g, (value) => {
      let cleanValue = /(\d+)/.exec(value)[1];
      return `x${cleanValue}`;
    });
    return Parser.parse(expression);

  };

  const createColumn = (computedColumn, index) => {
    let newColumn = {aggConfig: new AggConfig($scope.vis, {schema: 'metric', type: 'count'}), title: computedColumn.label};
    newColumn.aggConfig.id = `1.computed-column-${index}`;
    newColumn.aggConfig.key = `computed-column-${index}`;
    return newColumn;
  };

  const createRows = (column, rows, computedColumn) => {
    let parser = createParser(computedColumn);
    return _.map(rows, (row) => {
      let expressionParams = createExpressionsParams(computedColumn.formula, row);
      let value = parser.evaluate(expressionParams);
      let newCell = new AggConfigResult(column.aggConfig, void 0, value, value);
      newCell.toString = () => {
        return (typeof value === 'number') ? numeral(value).format(computedColumn.format) : value;
      };
      row.push(newCell);
      return row;
    });
  };

  const createTables = (tables, computedColumn, index) => {
    _.forEach(tables, (table) => {
      if (table.tables) {
        createTables(table.tables, computedColumn, index);
        return;
      }

      let newColumn = createColumn(computedColumn, index);
      table.columns.push(newColumn);
      table.rows = createRows(newColumn, table.rows, computedColumn);
    });
  };

  const hideColumns = (tables, hiddenColumns) => {
    if (!hiddenColumns) {
      return;
    }

    let removedCounter = 0;
    _.forEach(hiddenColumns.split(','), (item) => {
      let index = item * 1;
      _.forEach(tables, (table) => {
        table.columns.splice(index - removedCounter, 1);
        _.forEach(table.rows, (row) => {
          row.splice(index - removedCounter, 1);
        });
      });
      removedCounter++;
    });
  };

  $scope.sort = $scope.vis.params.sort;
  $scope.$watchCollection('sort', (newSort) => {
    $scope.uiState.set('vis.params.sort', newSort);
  });

  $scope.$watchMulti(['esResponse', 'vis.params'], ([resp]) => {
    console.debug('[enhanced-table] Watch es response and vis params called');
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

      _.forEach(computedColumns, (computedColumn, index) => {
        if (computedColumn.enabled) {
          createTables(tableGroups.tables, computedColumn, index);
    	}
      });

      hideColumns(tableGroups.tables, hiddenColumns);

      hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) {
          return table.tables.some(haveRows);
        }
        return table.rows.length > 0;
      });

      const showPagination = hasSomeRows && params.perPage && tableGroups.tables.some(function(table) {
        return table.rows.length > params.perPage;
      });
      $scope.tableVisContainerClass = {
        "hide-pagination": !showPagination,
        "hide-export-links": params.hideExportLinks
      };

      $element.trigger('renderComplete');
    }
    
    $scope.hasSomeRows = hasSomeRows;
    if (hasSomeRows) {
      $scope.tableGroups = tableGroups;
    }
  });

});
