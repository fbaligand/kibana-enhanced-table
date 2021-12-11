import { i18n } from '@kbn/i18n';
import { AggGroupNames } from '../../../src/plugins/data/public';

import tableVisTemplate from './enhanced-table-vis.html';
import { EnhancedTableOptions } from './components/enhanced_table_vis_options_lazy';
import { VIS_EVENT_TO_TRIGGER } from '../../../src/plugins/visualizations/public';

import { ENH_TABLE_VIS_NAME } from './types';
import { enhancedTableToExpressionAst } from './to_ast';


// define the visType object, which kibana will use to display and configure new Vis object of this type.
// eslint-disable-next-line no-unused-vars
export function enhancedTableVisTypeDefinition (core, context) {
  return {
    requiresSearch: true,
    type: 'table',
    name: ENH_TABLE_VIS_NAME,
    title: i18n.translate('visTypeEnhancedTable.visTitle', {
      defaultMessage: 'Enhanced Table'
    }),
    icon: 'visTable',
    description: i18n.translate('visTypeEnhancedTable.visDescription', {
      defaultMessage: 'Same functionality than Data Table, but with enhanced features like computed columns, filter bar and pivot table.'
    }),
    toExpressionAst: enhancedTableToExpressionAst,
    getSupportedTriggers: () => {
      return [VIS_EVENT_TO_TRIGGER.filter];
    },
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
        csvExportWithTotal: false,
        stripedRows: false,
        addRowNumberColumn: false,
        csvEncoding: 'utf-8',
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
      optionsTemplate: EnhancedTableOptions,
      schemas: [
        {
          group: AggGroupNames.Metrics,
          name: 'metric',
          title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.metricTitle', {
            defaultMessage: 'Metric'
          }),
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          aggSettings: {
            top_hits: {
              allowStrings: true
            }
          },
          min: 1,
          defaults: [{ type: 'count', schema: 'metric' }]
        },
        {
          group: AggGroupNames.Buckets,
          name: 'split',
          title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.splitTitle', {
            defaultMessage: 'Split table'
          }),
          min: 0,
          max: 1,
          aggFilter: ['!filter']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'bucket',
          title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.bucketTitle', {
            defaultMessage: 'Split rows'
          }),
          aggFilter: ['!filter']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'splitcols',
          title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.splitcolsTitle', {
            defaultMessage: 'Split cols'
          }),
          aggFilter: ['!filter'],
          max: 1,
          editor: '<div class="hintbox"><i class="fa fa-danger text-info"></i> This bucket must be the last one</div>'
        }
      ]
    },
    hierarchicalData: (vis) => {
      return Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels);
    }
  };
}
