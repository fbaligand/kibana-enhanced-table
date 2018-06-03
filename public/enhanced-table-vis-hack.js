import { uiModules } from  'ui/modules';
import chrome from 'ui/chrome';

const appId = chrome.getApp().id;

// Only inject decorator on kibana app
if (appId === 'kibana') {

  uiModules
  .get('kibana')
  .config(($provide) => {

    $provide.decorator('kbnAggTableDirective', ($delegate) => {
      // Original
      const originalController = $delegate[0].controller;

      // Customize formatted columns
      $delegate[0].controller = function ($scope) {
        originalController.call(this, $scope);
        $scope.$watch('formattedColumns', function () {
          if ($scope.table !== undefined && $scope.formattedColumns !== undefined) {
            for (let i=0; i < $scope.formattedColumns.length; i++) {
              $scope.formattedColumns[i].titleAlignmentClass = $scope.table.columns[i].titleAlignmentClass;
              $scope.formattedColumns[i].totalAlignmentClass = $scope.table.columns[i].totalAlignmentClass;
            }
            if ($scope.table.totalLabel !== undefined && $scope.formattedColumns.length > 0 && $scope.formattedColumns[0].total === undefined) {
              $scope.formattedColumns[0].total = $scope.table.totalLabel;
            }
          }
        });
      };

      return $delegate;
    });

    $provide.decorator('paginatedTableDirective', ($delegate) => {
      // Original
      const originalTemplate = $delegate[0].template;

      // Inject template
      $delegate[0].template = originalTemplate
        .replace('{{ col.class }}', '{{ col.class }} {{ col.titleAlignmentClass }}')
        .replace('numeric-value', 'numeric-value {{ col.totalAlignmentClass }}');

      return $delegate;
    });

  });
}