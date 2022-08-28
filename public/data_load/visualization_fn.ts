import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Render } from '../../../../src/plugins/expressions/public';
import { getIndexPatterns, getSearchService, getVisualization } from '../services';
import { enhancedTableRequestHandler } from './enhanced-table-request-handler';
import { enhancedTableResponseHandler } from './enhanced-table-response-handler';
import { documentTableResponseHandler } from './document-table-response-handler';
import { DOC_TABLE_VIS_NAME, ENH_TABLE_VIS_NAME, VisName } from '../types';

interface Arguments {
  index?: string | null;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  schemas?: string;
  visConfig?: string;
  uiState?: string;
  aggConfigs?: string;
  timeFields?: string[];
}

export interface CommonVisRenderValue {
    visType: string;
    visData: object;
    visConfig: object;
    params?: object;
  }

export type CommonExpressionFunctionDefinition = ExpressionFunctionDefinition<
  VisName,
  any,
  Arguments,
  Promise<Render<CommonVisRenderValue>>
>;

type ResponseHandler = (any) => any;

export const documentTableExpressionFunction = (): CommonExpressionFunctionDefinition => ({
    ...expressionFunction(DOC_TABLE_VIS_NAME,documentTableResponseHandler),
});

export const enhancedTableExpressionFunction = (): CommonExpressionFunctionDefinition => ({
    ...expressionFunction(ENH_TABLE_VIS_NAME,enhancedTableResponseHandler),
});

const expressionFunction = (visName: VisName, responseHandler: ResponseHandler): CommonExpressionFunctionDefinition => ({
  name: visName,
  type: 'render',
  help: i18n.translate('visualizations.functions.visualization.help', {
    defaultMessage: 'A simple visualization',
  }),
  args: {
    // TODO: Below `help` keys should be internationalized once this function
    // TODO: is moved to visualizations plugin.
    index: {
      // types: ['string', 'null'],
      types: ['string'],
      default: '',
      help: 'Index',
    },
    metricsAtAllLevels: {
      types: ['boolean'],
      default: false,
      help: 'Metrics levels',
    },
    partialRows: {
      types: ['boolean'],
      default: false,
      help: 'Partial rows',
    },
    schemas: {
      types: ['string'],
      default: '"{}"',
      help: 'Schemas',
    },
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: 'Visualization configuration',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
      help: 'User interface state',
    },
    aggConfigs: {
      types: ['string'],
      default: '"{}"',
      help: 'Aggregation configurations',
    },
  },
  async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, getExecutionContext }) {
    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const schemas = args.schemas ? JSON.parse(args.schemas) : {};
    const indexPattern = args.index ? await getIndexPatterns().get(args.index) : null;

    const aggConfigsState = args.aggConfigs ? JSON.parse(args.aggConfigs) : [];
    const aggOptions = { hierarchical: args.metricsAtAllLevels };
    const aggs = indexPattern
      ? getSearchService().aggs.createAggConfigs(indexPattern, aggConfigsState, aggOptions)
      : undefined;
    const visType = getVisualization().get(visName);

    input = await enhancedTableRequestHandler({
        abortSignal,
        aggs,
        filters: get(input, 'filters', null),
        indexPattern,
        inspectorAdapters,
        partialRows: args.partialRows,
        query: get(input, 'query', null),
        searchSessionId: getSearchSessionId(),
        timeFields: args.timeFields,
        timeRange: get(input, 'timeRange', null),
        executionContext: getExecutionContext(),
        visParams: visConfigParams,
    });


    if (input.columns) {
        // assign schemas to aggConfigs
        input.columns.forEach((column: any) => {
            if (column.aggConfig) {
                column.aggConfig.aggConfigs.schemas = visType.schemas.all;
            }
        });

        Object.keys(schemas).forEach((key) => {
            schemas[key].forEach((i: any) => {
            if (input.columns[i] && input.columns[i].aggConfig) {
                input.columns[i].aggConfig.schema = key;
            }
            });
        });

        // This only works if "inputs.columns" exist, so it makes
        // sense to have it here
        if (inspectorAdapters?.tables) {
          inspectorAdapters.tables.logDatatable('default', input);
        }
    }

    const response = await responseHandler(input);

    return {
      type: 'render',
      as: visName,
      value: {
        visData: response,
        visType: visType.name,
        visConfig: visConfigParams,
      },
    };
  },
});
