import { get, findLastIndex } from 'lodash';
import AggConfigResult from './agg_config_result';
import { fieldFormatter } from '../utils/field_formatter';


/**
 * Takes an array of tabified rows and splits them by column value:
 *
 * const rows = [
 *   { col-1: 'foo', col-2: 'X' },
 *   { col-1: 'bar', col-2: 50 },
 *   { col-1: 'baz', col-2: 'X' },
 * ];
 * const splitRows = splitRowsOnColumn(rows, 'col-2');
 * splitRows.results; // ['X', 50];
 * splitRows.rowsGroupedByResult; // { X: [{ col-1: 'foo' }, { col-1: 'baz' }], 50: [{ col-1: 'bar' }] }
 */
function splitRowsOnColumn(rows, columnId) {
  const resultsMap = {}; // Used to preserve types, since object keys are always converted to strings.
  return {
    rowsGroupedByResult: rows.reduce((acc, row) => {
      const { [columnId]: splitValue, ...rest } = row;
      resultsMap[splitValue] = splitValue;
      acc[splitValue] = [...(acc[splitValue] || []), rest];
      return acc;
    }, {}),
    results: Object.values(resultsMap),
  };
}

function splitTable(columns, rows, $parent) {
  const splitColumn = columns.find(column => get(column, 'meta.sourceParams.schema') === 'split');

  if (!splitColumn) {
    return [{
      $parent,
      columns: columns.map(column => ({ title: column.name, ...column })),
      rows: rows.map((row) => {
        const newRow = columns.map(column => {
          const aggConfigResult = new AggConfigResult(column.aggConfig, $parent, row[column.id], row[column.id]);
          return aggConfigResult;
        });
        columns.forEach(column => newRow[column.id] = row[column.id]);
        return newRow;
      })
    }];
  }

  const splitColumnIndex = columns.findIndex(column => column.id === splitColumn.id);
  const splitRows = splitRowsOnColumn(rows, splitColumn.id);

  // Check if there are buckets after the first metric.
  const firstMetricsColumnIndex = columns.findIndex(column => get(column, 'aggConfig.type.type') === 'metrics');
  const lastBucketsColumnIndex = findLastIndex(columns, column => get(column, 'aggConfig.type.type') === 'buckets');
  const metricsAtAllLevels = firstMetricsColumnIndex < lastBucketsColumnIndex;

  // Calculate metrics:bucket ratio.
  const numberOfMetrics = columns.filter(column => get(column, 'aggConfig.type.type') === 'metrics').length;
  const numberOfBuckets = columns.filter(column => get(column, 'aggConfig.type.type') === 'buckets').length;
  const metricsPerBucket = numberOfMetrics / numberOfBuckets;

  const filteredColumns = columns
    .filter((column, i) => {
      const isSplitColumn = i === splitColumnIndex;
      const isSplitMetric = metricsAtAllLevels && i > splitColumnIndex && i <= splitColumnIndex + metricsPerBucket;
      return !isSplitColumn && !isSplitMetric;
    })
    .map(column => ({ title: column.name, ...column }));

  return splitRows.results.map(splitValue => {
    const $newParent = new AggConfigResult(splitColumn.aggConfig, $parent, splitValue, splitValue);
    return {
      $parent: $newParent,
      aggConfig: splitColumn.aggConfig,
      title: `${fieldFormatter(splitColumn.aggConfig)(splitValue)}: ${splitColumn.aggConfig.makeLabel()}`,
      key: splitValue,
      // Recurse with filtered data to continue the search for additional split columns.
      tables: splitTable(filteredColumns, splitRows.rowsGroupedByResult[splitValue], $newParent),
    };
  });
}

export async function enhancedTableResponseHandler(response) {
  return { tables: splitTable(response.columns, response.rows, null), totalHits: response.totalHits, aggs: response.aggs, newResponse: true };
}


