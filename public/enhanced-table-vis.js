import './enhanced-table-vis-controller';
import './enhanced-table-vis-params';
import './agg_table';
import './agg_table/agg_table_group';

import { i18n } from '@kbn/i18n';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import tableVisTemplate from './enhanced-table-vis.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisFiltersProvider, createFiltersFromEvent } from 'ui/vis/vis_filters';

// we need to load the css ourselves

// we also need to load the controller and used by the template

// our params are a bit complex so we will manage them with a directive

// require the directives that we use as well

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(EnhancedTableVisTypeProvider);

// define the TableVisType
function EnhancedTableVisTypeProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const visFilters = Private(VisFiltersProvider);

  // define the EnhancedTableVisTypeProvider which is used in the template
  // by angular's ng-controller directive

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createAngularVisualization({
    type: 'table',
    name: 'enhanced-table',
    title: i18n.translate('tableVis.enhancedTableVisTitle', {
      defaultMessage: 'Enhanced Table'
    }),
    icon: 'visTable',
    description: i18n.translate('tableVis.enhancedTableVisDescription', {
      defaultMessage: 'Same functionality than Data Table, but with enhanced features like computed columns and filter bar.'
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
          aggSettings: {
            top_hits: {
              allowStrings: true
            }
          },
          min: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        },
        {
          group: 'buckets',
          name: 'split',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.splitTitle', {
            defaultMessage: 'Split table'
          }),
          min: 0,
          max: 1,
          aggFilter: ['!filter']
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.bucketTitle', {
            defaultMessage: 'Split rows'
          }),
          aggFilter: ['!filter']
        },
        {
          group: 'buckets',
          name: 'splitcols',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.splitcolsTitle', {
            defaultMessage: 'Split cols'
          }),
          aggFilter: ['!filter'],
          max: 1,
          editor: '<div class="hintbox"><i class="fa fa-danger text-info"></i> This bucket must be the last one</div>'
        }
      ])
    },
    requestHandler: function (context) {
      return context;
    },
    events: {
      filterBucket: {
        defaultAction: function (event, { simulate = false } = {}) {
          event.aggConfigs = event.data[0].table.columns.map(column => column.aggConfig);
          const filters = createFiltersFromEvent(event);
          visFilters.pushFilters(filters, simulate);
        }
      }
    },
    hierarchicalData: function (vis) {
      return Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels);
    }
  });
}

export default EnhancedTableVisTypeProvider;
