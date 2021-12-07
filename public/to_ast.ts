import { buildExpression, buildExpressionFunction, ExpressionAstExpression } from '../../../src/plugins/expressions/public';
import { getVisSchemas, VisToExpressionAst } from '../../../src/plugins/visualizations/public';
import { DocumentTableVisDataParams  } from './components/document_table_vis_data';
import { CommonExpressionFunctionDefinition } from './data_load/visualization_fn';
import { DocumentTableVisConfig, EnhancedTableVisConfig, ENH_TABLE_VIS_NAME, VisName } from './types';
import { DOC_TABLE_VIS_NAME } from './types'
import { EnhancedTableVisParams } from './components/enhanced_table_vis_options';

export type CommonVisDataParams = DocumentTableVisDataParams | EnhancedTableVisParams
export type CommonVisConfig = DocumentTableVisConfig | EnhancedTableVisConfig

type CommonVisToExpressionAst<CommonVisDataParams> = (vis, params, name) => ExpressionAstExpression | Promise<ExpressionAstExpression>;

export const documentTableToExpressionAst: VisToExpressionAst<CommonVisDataParams> = (vis,params) => {
  return toExpressionAst(vis,params,DOC_TABLE_VIS_NAME)
}

export const enhancedTableToExpressionAst: VisToExpressionAst<CommonVisDataParams> = (vis,params) => {
  return toExpressionAst(vis,params,ENH_TABLE_VIS_NAME)
}

const toExpressionAst: CommonVisToExpressionAst<CommonVisDataParams> = (vis, params, visName) => {

  const schemas = getVisSchemas(vis, params);

  const visConfig: CommonVisConfig = {
    ...vis.params,
    title: vis.title,
  };

  const table = buildExpressionFunction<CommonExpressionFunctionDefinition>(visName, {
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
