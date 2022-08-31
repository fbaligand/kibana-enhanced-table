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
import { handleCourierRequest } from './kibana_cloned_code/courier';
import { SearchSource } from '../../../../src/plugins/data/public/search/search_source';
import { RequestAdapter, DataAdapter } from '../../../../src/plugins/inspector/public';
import { getSearchService, getQueryService } from '../../../../src/plugins/data/public/services';
import { serializeAggConfig } from '../../../../src/plugins/data/public/search/expressions/utils';

export async function enhancedTableRequestHandler ({
  partialRows,
  metricsAtAllLevels,
  visParams,
  timeRange,
  query,
  filters,
  inspectorAdapters,
  forceFetch,
  aggConfigsState,
  index
}) {

  const { filterManager } = getQueryService();
  const searchService = getSearchService();
  const aggs = searchService.aggs.createAggConfigs(index, aggConfigsState);
  const MAX_HITS_SIZE = 10000;

  // create search source with query parameters
  const searchSource = new SearchSource();
  searchSource.setField('index', aggs.indexPattern);
  let hitsSize = (visParams.hitsSize !== undefined ? Math.min(visParams.hitsSize, MAX_HITS_SIZE) : 0);
  searchSource.setField('size', hitsSize);

  // specific request params for "field columns"
  if (visParams.fieldColumns !== undefined) {
    if (!visParams.fieldColumns.some(fieldColumn => fieldColumn.field.name === '_source')) {
      searchSource.setField('_source', visParams.fieldColumns.map(fieldColumn => fieldColumn.field.name));
    }
    searchSource.setField('docvalue_fields', visParams.fieldColumns.filter(fieldColumn => fieldColumn.field.readFromDocValues).map(fieldColumn => fieldColumn.field.name));
    const scriptFields = {};
    visParams.fieldColumns.filter(fieldColumn => fieldColumn.field.scripted).forEach(fieldColumn => {
      scriptFields[fieldColumn.field.name] = {
        script: {
          source: fieldColumn.field.script
        }
      };
    });
    searchSource.setField('script_fields', scriptFields);
  }

  // set search sort
  if (visParams.sortField !== undefined) {
    searchSource.setField('sort', [{
      [visParams.sortField.name]: {
        order: visParams.sortOrder
      }
    }]);
    if ((visParams.hitsSize !== undefined && visParams.hitsSize > MAX_HITS_SIZE) || visParams.csvFullExport) {
      searchSource.getField('sort').push({'_doc': {}});
    }
  }

  // add 'count' metric if there is no input column
  if (aggs.aggs.length === 0) {
    aggs.createAggConfig({
      id: '1',
      enabled: true,
      type: 'count',
      schema: 'metric',
      params: {}
    });
  }

  inspectorAdapters.requests = new RequestAdapter();
  inspectorAdapters.data = new DataAdapter();

  // execute elasticsearch query
  const request = {
    searchSource,
    aggs,
    timeRange,
    query,
    filters,
    forceFetch,
    metricsAtAllLevels,
    partialRows,
    inspectorAdapters,
    filterManager
  };
  const response = await handleCourierRequest(request);

  // set 'split tables' direction
  const splitAggs = aggs.bySchemaName('split');
  if (splitAggs.length > 0) {
    splitAggs[0].params.row = visParams.row;
  }

  // enrich response: total & aggs
  response.totalHits = _.get(searchSource, 'finalResponse.hits.total', -1);
  response.aggs = aggs;
  response.columns.forEach(column => {
    column.meta = serializeAggConfig(column.aggConfig);
  });

  // enrich response: hits
  if (visParams.fieldColumns !== undefined) {
    response.fieldColumns = visParams.fieldColumns;
    response.hits = _.get(searchSource, 'finalResponse.hits.hits', []);

    // continue requests until expected hits size is reached
    if (visParams.hitsSize !== undefined && visParams.hitsSize > MAX_HITS_SIZE && response.totalHits > MAX_HITS_SIZE) {
      let remainingSize = visParams.hitsSize;
      do {
        remainingSize -= hitsSize;
        const searchAfter = response.hits[response.hits.length - 1].sort;
        hitsSize = Math.min(remainingSize, MAX_HITS_SIZE);
        searchSource.setField('size', hitsSize);
        searchSource.setField('search_after', searchAfter);
        await handleCourierRequest(request);
        const nextResponseHits = _.get(searchSource, 'finalResponse.hits.hits', []);
        for (let i = 0; i < nextResponseHits.length; i++) {
          response.hits.push(nextResponseHits[i]);
        }
      } while (remainingSize > hitsSize);
    }

    // put request on response, if full csv download is enabled
    if (visParams.csvFullExport) {
      response.request = request;
    }
  }

  // return elasticsearch response
  return response;
}
