import { uiModules } from 'ui/modules';
import enhancedTableVisParamsTemplate from 'plugins/enhanced-table/enhanced-table-vis-params.html';

uiModules.get('kibana/enhanced-table', ['kibana'])
.directive('enhancedTableVisParams', function () {
  return {
    restrict: 'E',
    template: enhancedTableVisParamsTemplate,
    link: function ($scope) {
      $scope.totalAggregations = ['sum', 'avg', 'min', 'max', 'count'];

      $scope.$watchMulti([
        'vis.params.showPartialRows',
        'vis.params.showMeticsAtAllLevels'
      ], function () {
        if (!$scope.vis) return;

        const params = $scope.vis.params;
        if (params.showPartialRows || params.showMeticsAtAllLevels) {
          $scope.metricsAtAllLevels = true;
        } else {
          $scope.metricsAtAllLevels = false;
        }
      });

      $scope.addComputedColumn = function (computedColumns) {
        $scope.newComputedColumn = true;
        computedColumns.push({
          formula: 'col[0] * col[0]',
          format: 'number',
          pattern: '0,0',
          label: 'Value squared',
          alignment: 'left',
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

      $scope.initEditorOpen = function (computedColumn) {
        if ($scope.newComputedColumn) {
          $scope.newComputedColumn = false;
          return true;
        }
        else {
          return false;
        }
      };

    }
  };
});
