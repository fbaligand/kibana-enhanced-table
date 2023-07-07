import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { enhancedTableVisTypeDefinition } from './enhanced-table-vis';
import { documentTableVisTypeDefinition } from './document-table-vis';

import { setDataViewsStart, setFormatService, setNotifications, setSearchService, setVisualization } from './services';

import { getEnhancedTableVisLegacyRenderer, getDocumentTableVisLegacyRenderer } from './vis_legacy_renderer';
import { enhancedTableExpressionFunction, documentTableExpressionFunction } from './data_load/visualization_fn';




/** @internal */
export interface TablePluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface TablePluginStartDependencies {
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  visualizations: VisualizationsStart;
}

/** @internal */
export class EnhancedTablePlugin
  implements Plugin<void, void, TablePluginSetupDependencies, TablePluginStartDependencies> {

  public setup(
    core: CoreSetup<TablePluginStartDependencies>,
    { expressions, visualizations }: TablePluginSetupDependencies
  ) {
    expressions.registerFunction(enhancedTableExpressionFunction);
    expressions.registerRenderer(getEnhancedTableVisLegacyRenderer(core));
    visualizations.createBaseVisualization(
      enhancedTableVisTypeDefinition(core)
    );

    expressions.registerFunction(documentTableExpressionFunction);
    expressions.registerRenderer(getDocumentTableVisLegacyRenderer(core));
    visualizations.createBaseVisualization(
      documentTableVisTypeDefinition(core)
    );
  }

  public start(
    core: CoreStart,
    { data, dataViews, fieldFormats, visualizations }: TablePluginStartDependencies
  ) {
    setFormatService(fieldFormats);
    setNotifications(core.notifications);
    setSearchService(data.search);
    setDataViewsStart(dataViews);
    setVisualization(visualizations);
  }
}
