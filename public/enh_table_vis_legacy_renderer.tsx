/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, PluginInitializerContext } from 'kibana/public';
import { ExpressionRenderDefinition } from '../../../src/plugins/expressions';
import { TablePluginStartDependencies } from './plugin';
import { EnhancedTableVisRenderValue } from './components/enhanced_table_vis_options';

const tableVisRegistry = new Map<HTMLElement, any>();

export const getEnhancedTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext
) => ExpressionRenderDefinition<EnhancedTableVisRenderValue> = (core, context) => ({
  name: 'table_vis',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    let registeredController = tableVisRegistry.get(domNode);

    if (!registeredController) {
      const { getEnhancedTableVisualizationController } = await import('./vis_controller');

      const Controller = getEnhancedTableVisualizationController(core, context);
      registeredController = new Controller(domNode);
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