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
import chrome from 'ui/chrome';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { IndexPatternsProvider } from 'ui/index_patterns';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { PersistedState } from 'ui/persisted_state';

import { ExpressionFunction, Render } from 'core_plugins/interpreter/types';
import { AggConfigs } from 'ui/vis/agg_configs';


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

export type ExpressionFunctionVisualization = ExpressionFunction<
  'visualization',
  any,
  Arguments,
  Promise<Render<VisResponseValue>>
>;

export const visualization = (): ExpressionFunctionVisualization => ({
  name: 'enhanced_table_visualization',
  type: 'render',
  help: i18n.translate('interpreter.functions.visualization.help', {
    defaultMessage: 'enhanced table visualization',
  }),
  args: {
    index: {
      types: ['string', 'null'],
      default: null,
    },
    metricsAtAllLevels: {
      types: ['boolean'],
      default: false,
    },
    partialRows: {
      types: ['boolean'],
      default: false,
    },
    type: {
      types: ['string'],
      default: '',
    },
    schemas: {
      types: ['string'],
      default: '"{}"',
    },
    visConfig: {
      types: ['string'],
      default: '"{}"',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
    },
    aggConfigs: {
      types: ['string'],
      default: '"{}"',
    },
  },
  async fn(context, args, handlers) {
    try {
      console.log('visualization function ');
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private') as any;
    const visTypes = Private(VisTypesRegistryProvider);
    const indexPatterns = Private(IndexPatternsProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const schemas = args.schemas ? JSON.parse(args.schemas) : {};
    const visType = visTypes.byName[args.type || 'histogram'];
    const indexPattern = args.index ? await indexPatterns.get(args.index) : null;

    const uiStateParams = args.uiState ? JSON.parse(args.uiState) : {};
    const uiState = new PersistedState(uiStateParams);
    const aggConfigsState = JSON.parse(args.aggConfigs);
    const aggs = new AggConfigs(indexPattern, aggConfigsState);

    if (typeof visType.requestHandler === 'function') {
      context = await visType.requestHandler({
        partialRows: args.partialRows,
        metricsAtAllLevels: args.metricsAtAllLevels,
        index: indexPattern,
        visParams: visConfigParams,
        timeRange: get(context, 'timeRange', null),
        query: get(context, 'query', null),
        filters: get(context, 'filters', null),
        uiState,
        inspectorAdapters: handlers.inspectorAdapters,
        queryFilter,
        forceFetch: true,
        aggs
      });
    }

    if (typeof visType.responseHandler === 'function') {
      context = await visType.responseHandler(context, visConfigParams.dimensions);
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: args.type || '',
        visConfig: visConfigParams
      }
    };
    }
    catch (e) {
      console.log('visualization function error:');
      console.log(e);
    }
  }
});
