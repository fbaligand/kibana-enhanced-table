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

import _ from 'lodash';
import { CourierRequestHandlerProvider as courierRequestHandlerProvider } from 'ui/vis/request_handlers/courier';
import { SearchSourceProvider } from 'ui/courier/search_source';
import { RequestAdapter, DataAdapter } from 'ui/inspector/adapters';
import chrome from 'ui/chrome';

const courierRequestHandler = courierRequestHandlerProvider().handler;

const EnhancedTableRequestHandlerProvider = function () {

  return {
    name: 'enhanced-courier',
    handler: async function ({
      partialRows,
      metricsAtAllLevels,
      timeRange,
      query,
      filters,
      inspectorAdapters,
      queryFilter,
      forceFetch,
    },
    aggs) {

      const $injector = await chrome.dangerouslyGetActiveInjector();
      const Private = $injector.get('Private');
      const SearchSource = Private(SearchSourceProvider);
      const searchSource = new SearchSource();
      searchSource.setField('index', aggs.indexPattern);
      searchSource.setField('size', 0);

      inspectorAdapters.requests = new RequestAdapter();
      inspectorAdapters.data = new DataAdapter();

      const response = await courierRequestHandler({
        searchSource,
        aggs,
        timeRange,
        query,
        filters,
        forceFetch,
        metricsAtAllLevels,
        partialRows,
        inspectorAdapters,
        queryFilter
      });

      response.totalHits = _.get(searchSource, 'finalResponse.hits.total', -1);
      return response;
    }
  };
};

export { EnhancedTableRequestHandlerProvider };
