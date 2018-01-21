import { uiModules } from 'ui/modules';
import _ from 'lodash';

import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import AggConfigResult from 'ui/vis/agg_config_result';

// third-party dependencies
import { Parser } from 'expr-eval';
import handlebars from 'handlebars/dist/handlebars';

// get the kibana/enhanced-table module, and make sure that it requires the "kibana" module if it didn't already
const module = uiModules.get('kibana/enhanced-table', ['kibana']);

// add a controller to tha module, which will transform the esResponse into a
// tabular format that we can pass to the table directive
module.controller('EnhancedTableVisController', function ($scope, Private) {

  const tabifyAggResponse = Private(AggResponseTabifyProvider);
  const AggConfig = Private(VisAggConfigProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

  // controller methods

  const createExpressionParams = function (column, row) {
    let expressionParams = {};
    _.forEach(column.expressionParamsCols, function (expressionParamCol) {
      expressionParams[`col${expressionParamCol}`] = row[expressionParamCol].value;
    });
    return expressionParams;
  };

  const createParser = function (computedColumn) {
    let expression = computedColumn.formula.replace(/col\[(\d+)\]/g, 'col$1');
    return Parser.parse(expression);
  };

  const createColumn = function (computedColumn, index) {
    const FieldFormat = fieldFormats.getType(computedColumn.format);
    const fieldFormatParams = computedColumn.format === 'number' ? {pattern: computedColumn.pattern} : {};
    let newColumn = {
      aggConfig: new AggConfig($scope.vis, {schema: 'metric', type: 'count'}),
      title: computedColumn.label,
      fieldFormatter: new FieldFormat(fieldFormatParams),
      alignment: computedColumn.alignment,
      expressionParamsCols: []
    };
    newColumn.aggConfig.id = `1.computed-column-${index}`;
    newColumn.aggConfig.key = `computed-column-${index}`;
    let regex = /col\[?(\d+)\]?/g;
    let regexResult;
    while ((regexResult = regex.exec(computedColumn.formula)) !== null) {
      newColumn.expressionParamsCols.push(regexResult[1]);
    }
    if (computedColumn.applyTemplate && computedColumn.template !== undefined) {
      newColumn.template = handlebars.compile(computedColumn.template);
      newColumn.copyRowForTemplate = (computedColumn.template.indexOf('{{col.') != -1);
    }
    return newColumn;
  };

  const renderCell = function (contentType) {
    let result = this.column.fieldFormatter.convert(this.value);
    if (this.column.template !== undefined) {
      let context = { value: result, col: this.row };
      result = this.column.template(context);
    }
    if (this.column.alignment !== undefined && this.column.alignment !== 'left') {
      result = `<div align="${this.column.alignment}">${result}</div>`;
    }
    if (contentType !== 'html') {
      result = result.replace(/<(?:.|\n)*?>/gm, '');
    }
    return result;
  };

  const createComputedCells = function (column, rows, computedColumn, parser) {
    _.forEach(rows, function (row) {
      let expressionParams = createExpressionParams(column, row);
      let value = parser.evaluate(expressionParams);
      let parent = row.length > 0 && row[row.length-1];
      let newCell = new AggConfigResult(column.aggConfig, parent, value, value);
      newCell.column = column;
      if (column.copyRowForTemplate) {
        newCell.row = _.clone(row);
      }
      newCell.toString = renderCell;
      row.push(newCell);
    });
  };

  const createTables = function (tables, computedColumn, index, parser, newColumn) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        createTables(table.tables, computedColumn, index, parser, newColumn);
        return;
      }

      table.columns.push(newColumn);
      createComputedCells(newColumn, table.rows, computedColumn, parser);
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

      // process computed columns
      _.forEach(params.computedColumns, function (computedColumn, index) {
        if (computedColumn.enabled) {
          let parser = createParser(computedColumn);
          let newColumn = createColumn(computedColumn, index);
          createTables(tableGroups.tables, computedColumn, index, parser, newColumn);
        }
      });

      // process hidden columns
      if (params.hiddenColumns) {
        hideColumns(tableGroups.tables, params.hiddenColumns.split(','));
      }

      // process filter bar
      if ($scope.vis.filterInput === undefined) {
        $scope.vis.filterInput = $scope.activeFilter;
      }
      if (params.showFilterBar && $scope.showFilterInput() && $scope.activeFilter !== undefined && $scope.activeFilter !== '') {
        tableGroups.tables = filterTableRows(tableGroups.tables, $scope.activeFilter, params.filterCaseSensitive);
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

      $scope.renderComplete();
    }

    $scope.hasSomeRows = hasSomeRows;
    if (hasSomeRows) {
      $scope.tableGroups = tableGroups;
    }
  });
});
