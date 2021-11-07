/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '../../../src/plugins/expressions/public';
import { getVisSchemas, VisToExpressionAst } from '../../../src/plugins/visualizations/public';
import { EnhancedTableVisParams } from './components/enhanced_table_vis_options';
import { EnhancedTableExpressionFunctionDefinition } from './enh_table_fn';
import { EnhancedTableVisConfig } from './types';

const buildTableVisConfig = (
  schemas: ReturnType<typeof getVisSchemas>,
  visParams: EnhancedTableVisParams
) => {
  const metrics = schemas.metric;
  const buckets = schemas.bucket || [];
  const visConfig = {
    dimensions: {
      metrics,
      buckets,
      splitRow: schemas.split_row,
      splitColumn: schemas.split_column,
    },
  };

  if (visParams.showPartialRows && !visParams.showMetricsAtAllLevels) {
    // Handle case where user wants to see partial rows but not metrics at all levels.
    // This requires calculating how many metrics will come back in the tabified response,
    // and removing all metrics from the dimensions except the last set.
    const metricsPerBucket = metrics.length / buckets.length;
    visConfig.dimensions.metrics.splice(0, metricsPerBucket * buckets.length - metricsPerBucket);
  }
  return visConfig;
};

export const toExpressionAst: VisToExpressionAst<EnhancedTableVisParams> = (vis, params) => {

  const schemas = getVisSchemas(vis, params);

  const visConfig: EnhancedTableVisConfig = {
    ...vis.params,
    ...buildTableVisConfig(schemas, vis.params),
    title: vis.title,
  };

  const table = buildExpressionFunction<EnhancedTableExpressionFunctionDefinition>('enhanced-table', {
    visConfig: JSON.stringify(visConfig),
    schemas: JSON.stringify(schemas),
    index: vis.data.indexPattern!.id!,
    uiState: JSON.stringify(vis.uiState),
    aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
    partialRows: vis.params.showPartialRows,
    metricsAtAllLevels: vis.isHierarchical()
  });

  const ast = buildExpression([table]);

  return ast.toAst();
};
