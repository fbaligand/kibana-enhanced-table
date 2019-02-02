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

  // define the EnhancedTableVisProvider which is used in the template
  // by angular's ng-controller directive

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    type: 'table',
    name: 'enhanced-table',
    title: 'Enhanced Table',
    image,
    description: 'Same functionality than Data Table, but with enhanced features like computed columns and filter bar.',
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
