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

import './enhanced-table-vis-controller';
import './enhanced-table-vis-params';
import './agg_table';
import './agg_table/agg_table_group';
import { enhancedTableRequestHandler } from './data_load/enhanced-table-request-handler';
import { enhancedTableResponseHandler } from './data_load/enhanced-table-response-handler';
import { visualization } from './data_load/enhanced-table-visualization-fn';

import { i18n } from '@kbn/i18n';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import tableVisTemplate from './enhanced-table-vis.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisFiltersProvider } from 'ui/vis/vis_filters';
import { prepareJson, prepareString } from 'ui/visualize/loader/pipeline_helpers/build_pipeline';
import { functionsRegistry } from 'plugins/interpreter/registries';


// define the EnhancedTableVisTypeProvider which is used in the template by angular's ng-controller directive
function EnhancedTableVisTypeProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const visFilters = Private(VisFiltersProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createAngularVisualization({
    type: 'table',
    name: 'enhanced-table',
    title: i18n.translate('tableVis.enhancedTableVisTitle', {
      defaultMessage: 'Enhanced Table'
    }),
    icon: 'visTable',
    description: i18n.translate('tableVis.enhancedTableVisDescription', {
      defaultMessage: 'Same functionality than Data Table, but with enhanced features like computed columns, filter bar and pivot table.'
    }),
    visConfig: {
      defaults: {
        perPage: 10,
        showPartialRows: false,
        showMetricsAtAllLevels: false,
        sort: {
          columnIndex: null,
          direction: null
        },
        showTotal: false,
        totalFunc: 'sum',
        computedColumns: [],
        computedColsPerSplitCol: false,
        hideExportLinks: false,
        stripedRows: false,
        addRowNumberColumn: false,
        showFilterBar: false,
        filterCaseSensitive: false,
        filterBarHideable: false,
        filterAsYouType: false,
        filterTermsSeparately: false,
        filterHighlightResults: false,
        filterBarWidth: '25%'
      },
      template: tableVisTemplate
    },
    editorConfig: {
      optionsTemplate: '<enhanced-table-vis-params></enhanced-table-vis-params>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.metricTitle', {
            defaultMessage: 'Metric'
          }),
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          min: 1,
          defaults: [{ type: 'count', schema: 'metric' }]
        },
        {
          group: 'buckets',
          name: 'split',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.splitTitle', {
            defaultMessage: 'Split Table'
          }),
          min: 0,
          max: 1,
          aggFilter: ['!filter']
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.bucketTitle', {
            defaultMessage: 'Split Rows'
          }),
          aggFilter: ['!filter']
        },
        {
          group: 'buckets',
          name: 'splitcols',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.splitcolsTitle', {
            defaultMessage: 'Split Cols'
          }),
          aggFilter: ['!filter'],
          max: 1,
          editor: '<div class="hintbox"><i class="fa fa-danger text-info"></i> This bucket must be the last one</div>'
        }
      ])
    },
    requestHandler: enhancedTableRequestHandler,
    responseHandler: enhancedTableResponseHandler,
    events: {
      filterBucket: {
        defaultAction: function (event, { simulate = false } = {}) {
          event.aggConfigs = event.data[0].table.columns.map(column => column.aggConfig);
          visFilters.filter(event, simulate);
        }
      }
    },
    hierarchicalData: function (vis) {
      return Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels);
    },
    toExpression: function (vis) {
      const visState = vis.getCurrentState();
      const visConfig = visState.params;
      const { indexPattern } = vis;

      let pipeline = `enhanced_table_visualization type='${vis.type.name}'
        ${prepareJson('visConfig', visConfig)}
        metricsAtAllLevels=${vis.isHierarchical()}
        ${prepareJson('aggConfigs', visState.aggs)}
        partialRows=${vis.type.requiresPartialRows || vis.params.showPartialRows || false} `;

      if (indexPattern) {
        pipeline += `${prepareString('index', indexPattern.id)}`;
      }

      return pipeline;
    }
  });
}

export default EnhancedTableVisTypeProvider;

// register enhanced-table visualization function, to customize elasticsearch response transformation to table data
functionsRegistry.register(visualization);

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(EnhancedTableVisTypeProvider);
