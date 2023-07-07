import { CoreSetup } from '@kbn/core/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';
import { CommonVisRenderValue } from './data_load/visualization_fn';
import { TablePluginStartDependencies } from './plugin';
import { DOC_TABLE_VIS_NAME, ENH_TABLE_VIS_NAME, VisName } from './types';

const tableVisRegistry = new Map<HTMLElement, any>();

export const getEnhancedTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>
) => ExpressionRenderDefinition<CommonVisRenderValue> = (core) => ({
  ...getCommonVisLegacyRenderer(core,ENH_TABLE_VIS_NAME)
});

export const getDocumentTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>
) => ExpressionRenderDefinition<CommonVisRenderValue> = (core) => ({
  ...getCommonVisLegacyRenderer(core,DOC_TABLE_VIS_NAME)
});

const getCommonVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  visName: VisName
) => ExpressionRenderDefinition<CommonVisRenderValue> = (core, visName) => ({
  name: visName,
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    let registeredController = tableVisRegistry.get(domNode);

    if (!registeredController) {
      const { getEnhancedTableVisualizationController } = await import('./vis_controller');

      const Controller = getEnhancedTableVisualizationController(core);
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