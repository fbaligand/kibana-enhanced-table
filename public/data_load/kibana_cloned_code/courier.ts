import { i18n } from '@kbn/i18n';

import { calculateObjectHash } from '../../../../../src/plugins/kibana_utils/public';
import { PersistedState } from '../../../../../src/plugins/visualizations/public';
import { Adapters } from '../../../../../src/plugins/inspector/common';

import { IAggConfigs } from '../../../../../src/plugins/data/common/search/aggs';
import { ISearchSource } from '../../../../../src/plugins/data/common/search/search_source';
import {
  calculateBounds,
  Filter,
  getRequestInspectorStats,
  getResponseInspectorStats,
  getTime,
  IIndexPattern,
  isRangeFilter,
  Query,
  tabifyAggResponse,
  TimeRange,
} from '../../../../../src/plugins/data/common';

/**
 * Clone of: ../../../../../src/plugins/data/public/search/expressions/esaggs.ts
 * Components: RequestHandlerParams and handleCourierRequest
 */
interface RequestHandlerParams {
  searchSource: ISearchSource;
  aggs: IAggConfigs;
  timeRange?: TimeRange;
  timeFields?: string[];
  indexPattern?: IIndexPattern;
  query?: Query;
  filters?: Filter[];
  forceFetch: boolean;
  uiState?: PersistedState;
  partialRows?: boolean;
  inspectorAdapters: Adapters;
  searchSessionId?: string;
  metricsAtAllLevels?: boolean;
  visParams?: any;
  abortSignal?: AbortSignal;
}

export const handleCourierRequest = async ({
  searchSource,
  aggs,
  timeRange,
  timeFields,
  indexPattern,
  query,
  filters,
  forceFetch,
  partialRows,
  metricsAtAllLevels,
  inspectorAdapters,
  searchSessionId,
  abortSignal,
}: RequestHandlerParams) => {
  // Create a new search source that inherits the original search source
  // but has the appropriate timeRange applied via a filter.
  // This is a temporary solution until we properly pass down all required
  // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
  // Using callParentStartHandlers: true we make sure, that the parent searchSource
  // onSearchRequestStart will be called properly even though we use an inherited
  // search source.
  const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
  const requestSearchSource = timeFilterSearchSource.createChild({ callParentStartHandlers: true });

  aggs.setTimeRange(timeRange as TimeRange);

  // For now we need to mirror the history of the passed search source, since
  // the request inspector wouldn't work otherwise.
  Object.defineProperty(requestSearchSource, 'history', {
    get() {
      return searchSource.history;
    },
    set(history) {
      return (searchSource.history = history);
    },
  });

  requestSearchSource.setField('aggs', function () {
    return aggs.toDsl(metricsAtAllLevels);
  });

  requestSearchSource.onRequestStart((paramSearchSource, options) => {
    return aggs.onSearchRequestStart(paramSearchSource, options);
  });

  // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
  // pattern if it's available.
  const defaultTimeField = indexPattern?.getTimeField?.();
  const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
  const allTimeFields = timeFields && timeFields.length > 0 ? timeFields : defaultTimeFields;

  // If a timeRange has been specified and we had at least one timeField available, create range
  // filters for that those time fields
  if (timeRange && allTimeFields.length > 0) {
    timeFilterSearchSource.setField('filter', () => {
      return allTimeFields
        .map((fieldName) => getTime(indexPattern, timeRange, { fieldName }))
        .filter(isRangeFilter);
    });
  }

  requestSearchSource.setField('filter', filters);
  requestSearchSource.setField('query', query);

  const reqBody = await requestSearchSource.getSearchRequestBody();

  const queryHash = calculateObjectHash(reqBody);
  // We only need to reexecute the query, if forceFetch was true or the hash of the request body has changed
  // since the last request
  const shouldQuery = forceFetch || (searchSource as any).lastQuery !== queryHash;

  if (shouldQuery) {
    inspectorAdapters.requests.reset();
    const request = inspectorAdapters.requests.start(
      i18n.translate('data.functions.esaggs.inspector.dataRequest.title', {
        defaultMessage: 'Data',
      }),
      {
        description: i18n.translate('data.functions.esaggs.inspector.dataRequest.description', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the data for the visualization.',
        }),
        searchSessionId
      }
    );
    request.stats(getRequestInspectorStats(requestSearchSource));

    try {
      const response = await requestSearchSource.fetch({
        abortSignal,
        sessionId: searchSessionId
      });

      (searchSource as any).lastQuery = queryHash;

      request.stats(getResponseInspectorStats(response, searchSource)).ok({ json: response });

      (searchSource as any).rawResponse = response;
    } catch (e) {
      // Log any error during request to the inspector
      if (request) {
        request.error({ json: e });
      }
      throw e;
    } finally {
      // Add the request body no matter if things went fine or not
      request.json(await requestSearchSource.getSearchRequestBody());
    }
  }

  // Note that rawResponse is not deeply cloned here, so downstream applications using courier
  // must take care not to mutate it, or it could have unintended side effects, e.g. displaying
  // response data incorrectly in the inspector.
  let response = (searchSource as any).rawResponse;
  for (const agg of aggs.aggs) {
    if (agg.enabled && typeof agg.type.postFlightRequest === 'function') {
      response = await agg.type.postFlightRequest(
        response,
        aggs,
        agg,
        requestSearchSource,
        inspectorAdapters.requests,
        abortSignal,
        searchSessionId
      );
    }
  }

  (searchSource as any).finalResponse = response;

  const parsedTimeRange = timeRange ? calculateBounds(timeRange) : null;
  const tabifyParams = {
    metricsAtAllLevels,
    partialRows,
    timeRange: parsedTimeRange
      ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
      : undefined,
  };

  const tabifyCacheHash = calculateObjectHash({ tabifyAggs: aggs, ...tabifyParams });
  // We only need to reexecute tabify, if either we did a new request or some input params to tabify changed
  const shouldCalculateNewTabify =
    shouldQuery || (searchSource as any).lastTabifyHash !== tabifyCacheHash;

  if (shouldCalculateNewTabify) {
    (searchSource as any).lastTabifyHash = tabifyCacheHash;
    (searchSource as any).tabifiedResponse = tabifyAggResponse(aggs,
      (searchSource as any).finalResponse,
      tabifyParams
    );
  }

  return (searchSource as any).tabifiedResponse;
};
