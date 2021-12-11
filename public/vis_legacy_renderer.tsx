import { CoreSetup, PluginInitializerContext } from 'kibana/public';
import { ExpressionRenderDefinition } from '../../../src/plugins/expressions';
import { CommonVisRenderValue } from './data_load/visualization_fn';
import { TablePluginStartDependencies } from './plugin';
import { DOC_TABLE_VIS_NAME, ENH_TABLE_VIS_NAME, VisName } from './types';

const tableVisRegistry = new Map<HTMLElement, any>();

export const getEnhancedTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext
) => ExpressionRenderDefinition<CommonVisRenderValue> = (core, context) => ({
  ...getCommonVisLegacyRenderer(core,context,ENH_TABLE_VIS_NAME)
});

export const getDocumentTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext
) => ExpressionRenderDefinition<CommonVisRenderValue> = (core, context) => ({
  ...getCommonVisLegacyRenderer(core,context,DOC_TABLE_VIS_NAME)
});

const getCommonVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext,
  visName: VisName
) => ExpressionRenderDefinition<CommonVisRenderValue> = (core, context, visName) => ({
  name: visName,
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    let registeredController = tableVisRegistry.get(domNode);

    if (!registeredController) {
      const { getEnhancedTableVisualizationController } = await import('./vis_controller');

      const Controller = getEnhancedTableVisualizationController(core, context);
      registeredController = new Controller(domNode, config.visType);
      tableVisRegistry.set(domNode, registeredController);

      handlers.onDestroy(() => {
        registeredController?.destroy();
        tableVisRegistry.delete(domNode);
      });
    }

    await registeredController.render(config.visData, config.visConfig, handlers);
    handlers.done();
  },
});