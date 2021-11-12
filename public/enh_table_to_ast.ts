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
import { CommonExpressionFunctionDefinition } from './visualization_fn';
import { EnhancedTableVisConfig } from './types';
import { ENH_TABLE_VIS_NAME } from './types'

export const toExpressionAst: VisToExpressionAst<EnhancedTableVisParams> = (vis, params) => {

  const schemas = getVisSchemas(vis, params);

  const visConfig: EnhancedTableVisConfig = {
    ...vis.params,
    title: vis.title,
  };

  const table = buildExpressionFunction<CommonExpressionFunctionDefinition>(ENH_TABLE_VIS_NAME, {
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
