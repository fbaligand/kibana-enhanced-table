import { i18n } from '@kbn/i18n';
import { defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { get } from 'lodash';

import type { Filter, TimeRange } from '@kbn/es-query';

import type { KibanaExecutionContext } from '@kbn/core/public';
import { Adapters } from '@kbn/inspector-plugin/public';

import {
  calculateBounds,
  DataView,
  Query,
  IAggConfigs,
  ISearchStartSearchSource,
  tabifyAggResponse
} from '@kbn/data-plugin/common';


/**
 * Clone of: ../../../../../src/plugins/data/common/search/expressions/esaggs/request_handler.ts
 * Customizations:
 * - searchSourceFields param
 * - response.totalHits
 * - response.hits
 */

/** @internal */
export interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  aggs: IAggConfigs;
  filters?: Filter[];
  indexPattern?: DataView;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  query?: Query;
  searchSessionId?: string;
  searchSourceService: ISearchStartSearchSource;
  timeFields?: string[];
  timeRange?: TimeRange;
  getNow?: () => Date;
  executionContext?: KibanaExecutionContext;
  searchSourceFields: {[key: string]: any};
}

export const handleRequest = ({
  abortSignal,
  aggs,
  filters,
  indexPattern,
  inspectorAdapters,
  partialRows,
  query,
  searchSessionId,
  searchSourceService,
  timeFields,
  timeRange,
  getNow,
  executionContext,
  searchSourceFields,
}: RequestHandlerParams) => {
  return defer(async () => {
    const forceNow = getNow?.();
    const searchSource = await searchSourceService.create();

    searchSource.setField('index', indexPattern);
    Object.keys(searchSourceFields).forEach(fieldName => {
      searchSource.setField(fieldName as any, searchSourceFields[fieldName]);
    });

    // Create a new search source that inherits the original search source
    // but has the appropriate timeRange applied via a filter.
    // This is a temporary solution until we properly pass down all required
    // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
    // Using callParentStartHandlers: true we make sure, that the parent searchSource
    // onSearchRequestStart will be called properly even though we use an inherited
    // search source.
    const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
    const requestSearchSource = timeFilterSearchSource.createChild({
      callParentStartHandlers: true,
    });

    // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
    // pattern if it's available.
    const defaultTimeField = indexPattern?.getTimeField?.();
    const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
    const allTimeFields = timeFields?.length ? timeFields : defaultTimeFields;

    aggs.setTimeRange(timeRange as TimeRange);
    aggs.setForceNow(forceNow);
    aggs.setTimeFields(allTimeFields);

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

    requestSearchSource.setField('aggs', aggs);

    requestSearchSource.onRequestStart((paramSearchSource, options) => {
      return aggs.onSearchRequestStart(paramSearchSource, options);
    });

    // If a timeRange has been specified and we had at least one timeField available, create range
    // filters for that those time fields
    if (timeRange && allTimeFields.length > 0) {
      timeFilterSearchSource.setField('filter', () => {
        return aggs.getSearchSourceTimeFilter(forceNow);
      });
    }

    requestSearchSource.setField('filter', filters);
    requestSearchSource.setField('query', query);

    return { allTimeFields, forceNow, requestSearchSource };
  }).pipe(
    switchMap(({ allTimeFields, forceNow, requestSearchSource }) =>
      requestSearchSource
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
          executionContext,
        })
        .pipe(
          map(({ rawResponse: response }) => {
            const parsedTimeRange = timeRange ? calculateBounds(timeRange, { forceNow }) : null;
            const tabifyParams = {
              metricsAtAllLevels: aggs.hierarchical,
              partialRows,
              timeRange: parsedTimeRange
                ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
                : undefined,
            };

            return {
              ...tabifyAggResponse(aggs, response, tabifyParams),
              totalHits: get(response, 'hits.total', -1),
              hits: get(response, 'hits.hits', []),
            };
          })
        )
    )
  );
};
