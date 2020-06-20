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

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  VisResponseValue,
} from '../../../../src/plugins/visualizations/public';
import {
  ExpressionFunctionDefinition,
  Render,
} from '../../../../src/plugins/expressions/public';
import { getTypes, getIndexPatterns, getFilterManager } from '../../../../src/legacy/core_plugins/visualizations/public/np_ready/public/services';


interface Arguments {
  index?: string | null;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  type?: string;
  schemas?: string;
  visConfig?: string;
  uiState?: string;
  aggConfigs?: string;
}

export type ExpressionFunctionVisualization = ExpressionFunctionDefinition<
  'enhanced_table_visualization',
  any,
  Arguments,
  Promise<Render<VisResponseValue>>
>;

export const createEnhancedVisualizationFn = (): ExpressionFunctionVisualization => ({
  name: 'enhanced_table_visualization',
  type: 'render',
  help: i18n.translate('visualizations.functions.enhanced_visualization.help', {
    defaultMessage: 'enhanced table visualization',
  }),
  args: {
    index: {
      types: ['string', null],
      default: null,
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
    type: {
      types: ['string'],
      default: '',
      help: 'Type',
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
    const visType = getTypes().get(args.type || 'histogram') as any;
    const indexPattern = args.index ? await getIndexPatterns().get(args.index) : null;


    const aggConfigsState = JSON.parse(args.aggConfigs);

    if (typeof visType.requestHandler === 'function') {
      input = await visType.requestHandler({
        partialRows: args.partialRows,
        metricsAtAllLevels: args.metricsAtAllLevels,
        index: indexPattern,
        visParams: visConfigParams,
        timeRange: get(input, 'timeRange', null),
        query: get(input, 'query', null),
        filters: get(input, 'filters', null),
        inspectorAdapters,
        queryFilter: getFilterManager(),
        forceFetch: true,
        aggConfigsState
      });
    }

    if (typeof visType.responseHandler === 'function') {
      input = await visType.responseHandler(input, visConfigParams.dimensions);
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: input,
        visType: args.type || '',
        visConfig: visConfigParams,
      },
    };
  },
});
