/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { PersistedState } from '../../../src/plugins/visualizations/public';
import { ExpressionFunctionDefinition, Render } from '../../../src/plugins/expressions/public';
import { getIndexPatterns, getFilterManager, getSearchService, getVisualization } from './services';
import { enhancedTableRequestHandler } from './data_load/enhanced-table-request-handler';
import { enhancedTableResponseHandler } from './data_load/enhanced-table-response-handler';
import { ENH_TABLE_VIS_NAME } from './types'

interface Arguments {
  index?: string | null;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  schemas?: string;
  visConfig?: string;
  uiState?: string;
  aggConfigs?: string;
}

export interface EnhancedTableVisRenderValue {
    visType: string;
    visData: object;
    visConfig: object;
    params?: object;
  }

export type EnhancedTableExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof ENH_TABLE_VIS_NAME,
  any,
  Arguments,
  Promise<Render<EnhancedTableVisRenderValue>>
>;

export const enhancedTableExpressionFunction = (): EnhancedTableExpressionFunctionDefinition => ({
  name: ENH_TABLE_VIS_NAME,
  type: 'render',
  help: i18n.translate('visualizations.functions.visualization.help', {
    defaultMessage: 'A simple visualization',
  }),
  args: {
    // TODO: Below `help` keys should be internationalized once this function
    // TODO: is moved to visualizations plugin.
    index: {
      //types: ['string', 'null'],
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
  async fn(input, args, { inspectorAdapters }) {
    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const schemas = args.schemas ? JSON.parse(args.schemas) : {};
    const indexPattern = args.index ? await getIndexPatterns().get(args.index) : null;

    const uiStateParams = args.uiState ? JSON.parse(args.uiState) : {};
    const uiState = new PersistedState(uiStateParams);

    const aggConfigsState = args.aggConfigs ? JSON.parse(args.aggConfigs) : [];
    const aggs = indexPattern
      ? getSearchService().aggs.createAggConfigs(indexPattern, aggConfigsState)
      : undefined;
    const visType = getVisualization().get(ENH_TABLE_VIS_NAME)

    input = await enhancedTableRequestHandler({
        partialRows: args.partialRows,
        metricsAtAllLevels: args.metricsAtAllLevels,
        //index: indexPattern,
        visParams: visConfigParams,
        timeRange: get(input, 'timeRange', null),
        query: get(input, 'query', null),
        filters: get(input, 'filters', null),
        //uiState,
        inspectorAdapters,
        queryFilter: getFilterManager(),
        aggs,
        forceFetch: true
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
    }

    input = await enhancedTableResponseHandler(input, visConfigParams.dimensions);
    

    return {
      type: 'render',
      as: ENH_TABLE_VIS_NAME,
      value: {
        visData: input,
        visType: visType.name,
        visConfig: visConfigParams,
      },
    };
  },
});
