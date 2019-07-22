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
