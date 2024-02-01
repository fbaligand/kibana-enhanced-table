import { get } from 'lodash';
import { serializeAggConfig } from './kibana_cloned_code/utils';
import AggConfigResult from './agg_config_result';

function createColumn(fieldColumn, index, aggConfigs) {

  const aggConfigOptions = {
    id: `${index}`,
    enabled: true,
    type: 'terms',
    schema: 'bucket',
    params: {
      field: aggConfigs.indexPattern.fields.getByName(fieldColumn.field.name)
    }
  };

  // create new column object
  const columnTitle = fieldColumn.label ? fieldColumn.label : fieldColumn.field.name;
  const newColumn = {
    id: `col-${index}`,
    aggConfig: aggConfigs.createAggConfig(aggConfigOptions, { addToAggConfigs: false }),
    name: columnTitle,
    title: columnTitle
  };
  newColumn.meta = serializeAggConfig(newColumn.aggConfig);
  newColumn.aggConfig.isFilterable = () => newColumn.aggConfig.params.field.aggregatable;

  return newColumn;
}

const createCell = function (hit, column, parent) {
  let value = get(hit._source, column.aggConfig.fieldName(), null);
  if (value === null || column.aggConfig.getField().type !== 'string') {
    if ((column.aggConfig.getField().aggregatable || column.aggConfig.getField().scripted) && hit.fields !== undefined) {
      value = get(hit.fields, column.aggConfig.fieldName(), null);
      if (value !== null && value.length === 1) {
        value = value[0];
      }
    }
    else if (column.aggConfig.fieldName().startsWith('_')) {
      value = get(hit, column.aggConfig.fieldName(), null);
    }
  }
  const newCell = new AggConfigResult(column.aggConfig, parent, value, value);
  return newCell;
};

function createRow(hit, columns) {
  const newRow = [];
  columns.forEach( (column, i) => {
    newRow[i] = createCell(hit, column, newRow.length > 0 && newRow[newRow.length-1]);
    newRow[column.id] = newRow[i].value;
  });
  return newRow;
}

export function createTable(response) {
  const table = { columns: [], rows: [], request: response.request };

  const aggConfigs = response.aggs;
  aggConfigs.aggs = [];

  response.fieldColumns.forEach( (fieldColumn, index) => {
    if (fieldColumn.enabled) {
      const newColumn = createColumn(fieldColumn, index, aggConfigs);
      table.columns.push(newColumn);
    }
  });

  response.hits.forEach( hit => {
    const newRow = createRow(hit, table.columns);
    table.rows.push(newRow);
  });

  return table;
}

export function documentTableResponseHandler(response) {
  return { tables: [ createTable(response) ], totalHits: response.totalHits, aggs: response.aggs, newResponse: true };
}
