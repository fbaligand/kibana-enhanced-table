import _ from 'lodash';
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

      $scope.addComputedColumn = (computedColumns) => {
        computedColumns.push({
          formula: 'col[0] * col[0]',
          label: 'Value squared',
          format: '0,0',
          enabled: true
        });
      };

      $scope.removeComputedColumn = (output, computedColumns) => {
        const index = computedColumns.indexOf(output);
        if (index >= 0) {
          computedColumns.splice(index, 1);
        }
    
        if (computedColumns.length === 1) {
          computedColumns[0].enabled = true;
        }
      }

    }
  };
});
