import _ from 'lodash';

import AggConfigResult from '../data_load/agg_config_result';
import paginatedTableTemplate from './paginated_table.html';

export function EnhancedPaginatedTable() {
  EnhancedPaginatedTableController.$inject = ['$scope','$filter'];
  return {
    restrict: 'E',
    template: paginatedTableTemplate,
    transclude: true,
    scope: {
      table: '=',
      rows: '=',
      columns: '=',
      linkToTop: '=',
      perPage: '=?',
      showBlankRows: '=?',
      sortHandler: '=?',
      sort: '=?',
      showSelector: '=?',
      showTotal: '=',
      totalFunc: '=',
      filter: '='
    },
    controllerAs: 'enhancedPaginatedTable',
    controller: EnhancedPaginatedTableController
  };
}

function EnhancedPaginatedTableController($scope,$filter){
  const orderBy = $filter('orderBy');
  const self = this;
  self.sort = {
    columnIndex: null,
    direction: null
  };

  self.sortColumn = function (colIndex, sortDirection = 'asc') {
    const col = $scope.columns[colIndex];

    if (!col) return;
    if (col.sortable === false) return;

    if (self.sort.columnIndex === colIndex) {
      const directions = {
        null: 'asc',
        'asc': 'desc',
        'desc': null
      };
      sortDirection = directions[self.sort.direction];
    }

    self.sort.columnIndex = colIndex;
    self.sort.direction = sortDirection;
    if ($scope.sort) {
      _.assign($scope.sort, self.sort);
    }
  };

  self.rowsToShow = function (numRowsPerPage, actualNumRowsOnThisPage) {
    if ($scope.showBlankRows === false) {
      return actualNumRowsOnThisPage;
    } else {
      return numRowsPerPage;
    }
  };

  function valueGetter(row) {
    let value = row[self.sort.columnIndex];
    if (value && value.value != null) value = value.value;
    if (typeof value === 'boolean') value = value ? 0 : 1;
    if (value instanceof AggConfigResult && value.valueOf() === null) value = false;
    return value;
  }

  // Set the sort state if it is set
  if ($scope.sort && $scope.sort.columnIndex !== null) {
    self.sortColumn($scope.sort.columnIndex, $scope.sort.direction);
  }
  function resortRows() {
    const newSort = $scope.sort;
    if (newSort && !_.isEqual(newSort, self.sort)) {
      self.sortColumn(newSort.columnIndex, newSort.direction);
    }

    if (!$scope.rows || !$scope.columns) {
      $scope.sortedRows = false;
      return;
    }

    const sort = self.sort;
    if (sort.direction == null) {
      $scope.sortedRows = $scope.rows.slice(0);
    } else {
      $scope.sortedRows = orderBy($scope.rows, valueGetter, sort.direction === 'desc');
    }
  }


  // update the sortedRows result
  $scope.$watchMulti([
    'rows',
    'columns',
    '[]sort',
    '[]enhancedPaginatedTable.sort'
  ], resortRows);
}