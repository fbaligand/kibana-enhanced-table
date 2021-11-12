/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '../../../src/plugins/expressions/public';
import { getVisSchemas, VisToExpressionAst } from '../../../src/plugins/visualizations/public';
import { DocumentTableVisDataParams  } from './components/document_table_vis_data';
import { CommonExpressionFunctionDefinition } from './visualization_fn';
import { DocumentTableVisConfig } from './types';
import { DOC_TABLE_VIS_NAME } from './types'

export const toExpressionAst: VisToExpressionAst<DocumentTableVisDataParams> = (vis, params) => {

  const schemas = getVisSchemas(vis, params);

  const visConfig: DocumentTableVisConfig = {
    ...vis.params,
    title: vis.title,
  };

  const table = buildExpressionFunction<CommonExpressionFunctionDefinition>(DOC_TABLE_VIS_NAME, {
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
