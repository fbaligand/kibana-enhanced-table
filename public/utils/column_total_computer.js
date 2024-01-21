import _ from 'lodash';

function sum(tableRows, columnIndex) {
  return _.reduce(tableRows, function (prev, curr) {
  // some metrics return undefined for some of the values
  // derivative is an example of this as it returns undefined in the first row
    if (curr[columnIndex].value === undefined) return prev;
    return prev + curr[columnIndex].value;
  }, 0);
}

/**
 * Compute and return one column total, given its column index and total function
 */
export function computeColumnTotal(columnIndex, totalFunc, table, computedColsPerSplitCol, splitColIndex, refRow) {
  let total = undefined;
  let isFieldNumeric = false;
  let isFieldDate = false;
  const column = table.columns[columnIndex];
  const agg = column.aggConfig;
  const aggType = agg.type;
  const field = agg.params.field;

  if (aggType && aggType.type === 'metrics') {
    if (aggType.name === 'top_hits') {
      if (agg.params.aggregate.value !== 'concat') {
      // all other aggregate types for top_hits output numbers
      // so treat this field as numeric
        isFieldNumeric = true;
      }
    } else if(aggType.name === 'cardinality') {
      // Unique count aggregations always produce a numeric value
      isFieldNumeric = true;
    } else if (field) {
    // if the metric has a field, check if it is either number or date
      isFieldNumeric = field.type === 'number';
      isFieldDate = field.type === 'date';
    } else {
    // if there is no field, then it is count or similar so just say number
      isFieldNumeric = true;
    }
  } else if (field) {
    isFieldNumeric = field.type === 'number';
    isFieldDate = field.type === 'date';
  }

  if (isFieldNumeric || isFieldDate || totalFunc === 'count') {

    // filter rows to compute (if computedColsPerSplitCol)
    let rowsToCompute = table.rows;
    if (computedColsPerSplitCol) {
      const refRowSplitColValue = refRow[splitColIndex].value;
      rowsToCompute = rowsToCompute.filter(currentRow => currentRow[splitColIndex].value === refRowSplitColValue);
    }

    switch (totalFunc) {
    case 'sum':
      if (!isFieldDate) {
        total = sum(rowsToCompute, columnIndex);
      }
      break;
    case 'avg':
      if (!isFieldDate) {
        total = sum(rowsToCompute, columnIndex) / rowsToCompute.length;
      }
      break;
    case 'min':
      total = _.chain(rowsToCompute).map(columnIndex).map('value').min().value();
      break;
    case 'max':
      total = _.chain(rowsToCompute).map(columnIndex).map('value').max().value();
      break;
    case 'count':
      total = rowsToCompute.length;
      break;
    default:
      break;
    }
  }

  return total;
}
