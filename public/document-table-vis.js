import { i18n } from '@kbn/i18n';

import tableVisTemplate from './enhanced-table-vis.html';
import { getEnhancedTableVisualizationController } from './vis_controller';
import { enhancedTableRequestHandler } from './data_load/enhanced-table-request-handler';
import { documentTableResponseHandler } from './data_load/document-table-response-handler';
import { DocumentTableData } from './components/document_table_vis_data';
import { EnhancedTableOptions } from './components/enhanced_table_vis_options_lazy';
import { VIS_EVENT_TO_TRIGGER } from '../../../src/plugins/visualizations/public';


// define the visType object, which kibana will use to display and configure new Vis object of this type.
export function documentTableVisTypeDefinition (core, context) {
  return {
    type: 'table',
    name: 'document_table',
    title: i18n.translate('visTypeDocumentTable.visTitle', {
      defaultMessage: 'Document Table'
    }),
    icon: 'visTable',
    description: i18n.translate('visTypeDocumentTable.visDescription', {
      defaultMessage: 'Same functionality than Data Table, but for single documents (not aggregations) and with enhanced features like computed columns, filter bar and pivot table.'
    }),
    visualization: getEnhancedTableVisualizationController(core, context),
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
        sortSplitCols: false,
        hideExportLinks: false,
        csvExportWithTotal: false,
        csvFullExport: false,
        stripedRows: false,
        addRowNumberColumn: false,
        csvEncoding: 'utf-8',
        showFilterBar: false,
        filterCaseSensitive: false,
        filterBarHideable: false,
        filterAsYouType: false,
        filterTermsSeparately: false,
        filterHighlightResults: false,
        filterBarWidth: '25%',
        /* document-table specific options*/
        fieldColumns: [
          {
            label: '',
            field: {
              name: '_source',
            },
            enabled: true
          }
        ],
        hitsSize: 10,
        sortField: {
          name: '_score',
        },
        sortOrder: 'desc'
      },
      template: tableVisTemplate
    },
    editorConfig: {
      optionTabs: [
        {
          name: 'fieldColumns',
          title: i18n.translate('visTypeDocumentTable.tabs.dataText', {
            defaultMessage: 'Data',
          }),
          editor: DocumentTableData
        },
        {
          name: 'options',
          title: i18n.translate('visTypeDocumentTable.tabs.optionsText', {
            defaultMessage: 'Options',
          }),
          editor: EnhancedTableOptions
        }
      ]
    },
    requestHandler: enhancedTableRequestHandler,
    responseHandler: documentTableResponseHandler,
    hierarchicalData: (vis) => {
      return Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels);
    }
  };
}
