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

import './enhanced-table-vis.less';
import './enhanced-table-vis-controller';
import './enhanced-table-vis-params';
import 'ui/agg_table';
import 'ui/agg_table/agg_table_group';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import tableVisTemplate from './enhanced-table-vis.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { AggTypesMetricsTopHitProvider } from 'ui/agg_types/metrics/top_hit';
import image from './images/icon-table.svg';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// our params are a bit complex so we will manage them with a directive

// require the directives that we use as well

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(EnhancedTableVisProvider);

// define the TableVisType
function EnhancedTableVisProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  // Enable string fields in top hit aggregation for enhanced-table plugin
  const topHitMetricAgg = Private(AggTypesMetricsTopHitProvider);
  const fieldParam = topHitMetricAgg.params.filter(param => param.name === 'field')[0];
  const filterFieldTypesOriginalMethod = fieldParam.filterFieldTypes;
  fieldParam.filterFieldTypes = (vis, value) => vis.type.name === 'enhanced-table' || filterFieldTypesOriginalMethod(vis, value);
  const concatOption = topHitMetricAgg.params.filter(param => param.name === 'aggregate')[0]
    .options.filter(option => option.val === 'concat')[0];
  const isCompatibleVisOriginalMethod = concatOption.isCompatibleVis;
  concatOption.isCompatibleVis = (name) => name === 'enhanced-table' || isCompatibleVisOriginalMethod(name);

  // define the EnhancedTableVisProvider which is used in the template
  // by angular's ng-controller directive

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    type: 'table',
    name: 'enhanced-table',
    title: 'Enhanced Table',
    image,
    description: 'Same functionality than Data Table, but with enhanced features like computed columns, filter bar and pivot table.',
    category: VisType.CATEGORY.DATA,
    template: tableVisTemplate,
    params: {
      defaults: {
        perPage: 10,
        showPartialRows: false,
        showMeticsAtAllLevels: false,
        sort: {
          columnIndex: null,
          direction: null
        },
        showTotal: false,
        totalFunc: 'sum',
        computedColumns: [],
        computedColsPerSplitCol: false,
        hideExportLinks: false,
        showFilterBar: false,
        filterCaseSensitive: false,
        filterBarHideable: false,
        filterAsYouType: false,
        filterTermsSeparately: false,
        filterHighlightResults: false,
        filterBarWidth: '25%'
      },
      editor: '<enhanced-table-vis-params></enhanced-table-vis-params>',
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Metric',
        aggFilter: ['!geo_centroid', '!geo_bounds'],
        min: 1,
        defaults: [
          { type: 'count', schema: 'metric' }
        ]
      },
      {
        group: 'buckets',
        name: 'split',
        title: 'Split Table',
        aggFilter: ['!filter']
      },
      {
        group: 'buckets',
        name: 'bucket',
        title: 'Split Rows',
        aggFilter: ['!filter']
      },
      {
        group: 'buckets',
        name: 'splitcols',
        title: 'Split Cols',
        aggFilter: ['!filter'],
        max: 1,
        editor: '<div class="hintbox"><i class="fa fa-danger text-info"></i> This bucket must be the last one</div>'
      }
    ]),
    implementsRenderComplete: true,
    responseHandler: 'none',
    hierarchicalData: function (vis) {
      return Boolean(vis.params.showPartialRows || vis.params.showMeticsAtAllLevels);
    }
  });
}

export default EnhancedTableVisProvider;
