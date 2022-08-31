import { getSearchService } from '../services';
import { handleRequest } from './kibana_cloned_code/request_handler';

export async function enhancedTableRequestHandler ({
  abortSignal,
  aggs,
  filters,
  indexPattern,
  inspectorAdapters,
  partialRows,
  query,
  searchSessionId,
  timeFields,
  timeRange,
  visParams,
}) {

  const MAX_HITS_SIZE = 10000;

  // create search source fields
  const searchSourceFields = {};
  let hitsSize = (visParams.hitsSize !== undefined ? Math.min(visParams.hitsSize, MAX_HITS_SIZE) : 0);
  searchSourceFields.size = hitsSize;

  // specific request params for "field columns"
  if (visParams.fieldColumns !== undefined) {
    if (!visParams.fieldColumns.some(fieldColumn => fieldColumn.field.name === '_source')) {
      searchSourceFields._source = visParams.fieldColumns.map(fieldColumn => fieldColumn.field.name);
    }
    searchSourceFields.docvalue_fields = visParams.fieldColumns.filter(fieldColumn => fieldColumn.field.readFromDocValues).map(fieldColumn => fieldColumn.field.name);
    const scriptFields = {};
    visParams.fieldColumns.filter(fieldColumn => fieldColumn.field.scripted).forEach(fieldColumn => {
      scriptFields[fieldColumn.field.name] = {
        script: {
          source: fieldColumn.field.script
        }
      };
    });
    searchSourceFields.script_fields = scriptFields;
  }

  // set search sort
  if (visParams.sortField !== undefined) {
    searchSourceFields.sort = [{
      [visParams.sortField.name]: {
        order: visParams.sortOrder
      }
    }];
    if ((visParams.hitsSize !== undefined && visParams.hitsSize > MAX_HITS_SIZE) || visParams.csvFullExport) {
      searchSourceFields.sort.push({'_doc': {}});
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

  // execute elasticsearch query
  const request = {
    abortSignal,
    aggs,
    filters,
    indexPattern,
    inspectorAdapters,
    partialRows,
    query,
    searchSessionId,
    searchSourceService: getSearchService().searchSource,
    timeFields,
    timeRange,
    searchSourceFields,
  };
  const response = await handleRequest(request);

  // set 'split tables' direction
  const splitAggs = aggs.bySchemaName('split');
  if (splitAggs.length > 0) {
    splitAggs[0].params.row = visParams.row;
  }

  // enrich response: aggs
  response.aggs = aggs;

  // enrich columns: aggConfig
  response.columns.forEach( column => {
    column.aggConfig = aggs.byId(column.meta.sourceParams.id.split('.')[0]);
  });

  // enrich response: hits
  if (visParams.fieldColumns !== undefined) {
    response.fieldColumns = visParams.fieldColumns;

    // continue requests until expected hits size is reached
    if (visParams.hitsSize !== undefined && visParams.hitsSize > MAX_HITS_SIZE && response.totalHits > MAX_HITS_SIZE) {
      let remainingSize = visParams.hitsSize;
      do {
        remainingSize -= hitsSize;
        const searchAfter = response.hits[response.hits.length - 1].sort;
        hitsSize = Math.min(remainingSize, MAX_HITS_SIZE);
        searchSourceFields.size = hitsSize;
        searchSourceFields.search_after = searchAfter;
        const nextResponse = await handleRequest(request);
        for (let i = 0; i < nextResponse.hits.length; i++) {
          response.hits.push(nextResponse.hits[i]);
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