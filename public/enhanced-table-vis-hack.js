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

import { uiModules } from  'ui/modules';
import _ from 'lodash';
import chrome from 'ui/chrome';
import { aggTypeFieldFilters } from 'ui/agg_types/param_types/filter';
import { topHitMetricAgg } from 'ui/agg_types/metrics/top_hit';

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

      // Enable string fields in top hit aggregation for enhanced-table plugin
      const topHitFilter = _.find(Array.from(aggTypeFieldFilters.filters), (filter) => {
        const field = { type: 'string' };
        const fieldParamType = '';
        const aggConfig = { type: { name: 'top_hit' } };
        const tableVis = { type: { name: 'table' } };
        const enhancedTableVis = { type: { name: 'enhanced-table' } };
        try {
          return filter(field, fieldParamType, aggConfig, tableVis) && !filter(field, fieldParamType, aggConfig, enhancedTableVis);
        }
        catch (e) {
          return false;
        }
      });

      if (topHitFilter !== undefined) {
        aggTypeFieldFilters.filters.delete(topHitFilter);
        aggTypeFieldFilters.addFilter(
          (field, fieldParamType, aggConfig, vis) => {
            return vis.type.name === 'enhanced-table' || topHitFilter(field, fieldParamType, aggConfig, vis);
          }
        );

        const concatOption = topHitMetricAgg.params.filter(param => param.name === 'aggregate')[0]
          .options.filter(option => option.val === 'concat')[0];
        const isCompatibleVisOriginalMethod = concatOption.isCompatibleVis;
        concatOption.isCompatibleVis = (name) => name === 'enhanced-table' || isCompatibleVisOriginalMethod(name);
      }

    });
}