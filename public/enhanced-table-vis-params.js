import { uiModules } from 'ui/modules';
import enhancedTableVisParamsTemplate from './enhanced-table-vis-params.html';
import _ from 'lodash';

uiModules.get('kibana/enhanced-table')
  .directive('enhancedTableVisParams', function () {
    return {
      restrict: 'E',
      template: enhancedTableVisParamsTemplate,
      link: function ($scope) {
        $scope.totalAggregations = ['sum', 'avg', 'min', 'max', 'count'];

        if ($scope.editorState.params.perPage === undefined) {
          _.extend($scope.editorState.params, $scope.vis.type.params.defaults);
        }

        $scope.addComputedColumn = function (computedColumns) {
          $scope.newComputedColumn = true;
          computedColumns.push({
            label: 'Value squared',
            formula: 'col0 * col0',
            format: 'number',
            pattern: '0,0',
            datePattern: 'MMMM Do YYYY, HH:mm:ss.SSS',
            alignment: 'left',
            applyAlignmentOnTitle: true,
            applyAlignmentOnTotal: true,
            applyTemplate: false,
            applyTemplateOnTotal: true,
            template: '{{value}}',
            enabled: true
          });
        };

        $scope.removeComputedColumn = function (computedColumnToDelete, computedColumns) {
          const index = computedColumns.indexOf(computedColumnToDelete);
          if (index >= 0) {
            computedColumns.splice(index, 1);
          }

          if (computedColumns.length === 1) {
            computedColumns[0].enabled = true;
          }
        };

        $scope.initEditorOpen = function () {
          if ($scope.newComputedColumn) {
            $scope.newComputedColumn = false;
            return true;
          }
          else {
            return false;
          }
        };

        $scope.hasSplitColsBucket = function () {
          return _.some($scope.editorState.aggs.aggs, function(agg) {
            return agg.schema.name === 'splitcols' && agg.enabled;
          });
        };

      }
    };
  });
