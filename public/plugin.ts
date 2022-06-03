import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import { VisualizationsSetup, VisualizationsStart } from '../../../src/plugins/visualizations/public';

import { enhancedTableVisTypeDefinition } from './enhanced-table-vis';
import { documentTableVisTypeDefinition } from './document-table-vis';

import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { setFilterManager, setFormatService, setIndexPatterns, setNotifications, setQueryService, setSearchService, setVisualization } from './services';
import { Plugin as ExpressionsPublicPlugin } from '../../../src/plugins/expressions/public';

import { getEnhancedTableVisLegacyRenderer, getDocumentTableVisLegacyRenderer } from './vis_legacy_renderer';
import { enhancedTableExpressionFunction, documentTableExpressionFunction } from './data_load/visualization_fn';




/** @internal */
export interface TablePluginSetupDependencies {
  visualizations: VisualizationsSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
}

/** @internal */
export interface TablePluginStartDependencies {
  data: DataPublicPluginStart;
  visualizations: VisualizationsStart;
}

/** @internal */
export class EnhancedTablePlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext;
  createBaseVisualization: any;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup,
    { visualizations, expressions }: TablePluginSetupDependencies
  ) {
    expressions.registerFunction(enhancedTableExpressionFunction);
    expressions.registerRenderer(getEnhancedTableVisLegacyRenderer(core, this.initializerContext));
    visualizations.createBaseVisualization(
      enhancedTableVisTypeDefinition(core, this.initializerContext)
    );

    expressions.registerFunction(documentTableExpressionFunction);
    expressions.registerRenderer(getDocumentTableVisLegacyRenderer(core, this.initializerContext));
    visualizations.createBaseVisualization(
      documentTableVisTypeDefinition(core, this.initializerContext)
      );
  }

  public start(core: CoreStart, deps: TablePluginStartDependencies) {
    setFormatService(deps.data.fieldFormats);
    setNotifications(core.notifications);
    setQueryService(deps.data.query);
    setSearchService(deps.data.search);
    setIndexPatterns(deps.data.indexPatterns);
    setFilterManager(deps.data.query.filterManager);
    setVisualization(deps.visualizations);
  }
}
