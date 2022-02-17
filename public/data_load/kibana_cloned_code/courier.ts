import { i18n } from '@kbn/i18n';

import { Adapters } from '../../../../../src/plugins/inspector/common';

import { IAggConfigs } from '../../../../../src/plugins/data/common/search/aggs';
import { ISearchSource } from '../../../../../src/plugins/data/common/search/search_source';
import {
  calculateBounds,
  Filter,
  IndexPattern,
  Query,
  tabifyAggResponse,
  TimeRange,
} from '../../../../../src/plugins/data/common';

/**
 * Clone of: ../../../../../src/plugins/data/common/search/expressions/esaggs/request_handler.ts
 * Components: RequestHandlerParams and handleCourierRequest
 */
interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  aggs: IAggConfigs;
  filters?: Filter[];
  indexPattern?: IndexPattern;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  query?: Query;
  searchSessionId?: string;
  searchSource: ISearchSource;
  timeFields?: string[];
  timeRange?: TimeRange;
  getNow?: () => Date;
}

export const handleCourierRequest = async ({
  abortSignal,
  aggs,
  filters,
  indexPattern,
  inspectorAdapters,
  metricsAtAllLevels,
  partialRows,
  query,
  searchSessionId,
  searchSource,
  timeFields,
  timeRange,
  getNow,
}: RequestHandlerParams) => {
  const forceNow = getNow?.();

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
      searchSource.history = history;
    },
  });

  requestSearchSource.setField('aggs', aggs);

  requestSearchSource.onRequestStart((paramSearchSource, options) => {
    return aggs.onSearchRequestStart(paramSearchSource, options);
  });

  // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
  // pattern if it's available.
  const defaultTimeField = indexPattern?.getTimeField?.();
  const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
  const allTimeFields = timeFields && timeFields.length > 0 ? timeFields : defaultTimeFields;

  aggs.setForceNow(forceNow);
  aggs.setTimeFields(allTimeFields);

  // If a timeRange has been specified and we had at least one timeField available, create range
  // filters for that those time fields
  if (timeRange && allTimeFields.length > 0) {
    timeFilterSearchSource.setField('filter', () => {
      return aggs.getSearchSourceTimeFilter(forceNow);
    });
  }

  requestSearchSource.setField('filter', filters);
  requestSearchSource.setField('query', query);

  inspectorAdapters.requests?.reset();

  const { rawResponse: response } = await requestSearchSource
    .fetch$({
      abortSignal,
      sessionId: searchSessionId,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('data.functions.esaggs.inspector.dataRequest.title', {
          defaultMessage: 'Data',
        }),
        description: i18n.translate('data.functions.esaggs.inspector.dataRequest.description', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the data for the visualization.',
        }),
      },
    })
    .toPromise();

  const parsedTimeRange = timeRange ? calculateBounds(timeRange, { forceNow }) : null;
  const tabifyParams = {
    metricsAtAllLevels,
    partialRows,
    timeRange: parsedTimeRange
      ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
      : undefined,
  };

  // Need this so the enhancedTableRequestHandler can recover the hits for the document table
  (searchSource as any).finalResponse = response;

  const tabifiedResponse = tabifyAggResponse(aggs, response, tabifyParams);

  return tabifiedResponse;
};
