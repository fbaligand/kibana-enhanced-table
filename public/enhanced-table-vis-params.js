/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

        $scope.$watchMulti([
          'editorState.params.showPartialRows',
          'editorState.params.showMetricsAtAllLevels'
        ], function () {
          if (!$scope.vis) return;

          const params = $scope.editorState.params;
          if (params.showPartialRows || params.showMetricsAtAllLevels) {
            $scope.metricsAtAllLevels = true;
          } else {
            $scope.metricsAtAllLevels = false;
          }
        });

        $scope.addComputedColumn = function (computedColumns) {
          $scope.newComputedColumn = true;
          computedColumns.push({
            label: 'Value squared',
            formula: 'col0 * col0',
            computeTotalUsingFormula: false,
            format: 'number',
            pattern: '0,0',
            datePattern: 'MMMM Do YYYY, HH:mm:ss.SSS',
            alignment: 'left',
            applyAlignmentOnTitle: true,
            applyAlignmentOnTotal: true,
            applyTemplate: false,
            applyTemplateOnTotal: true,
            template: '{{value}}',
            customColumnPosition: '',
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
          return _.some($scope.editorState.aggs, function(agg) {
            return agg.schema.name === 'splitcols' && agg.enabled;
          });
        };

      }
    };
  });
