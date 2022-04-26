import type { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from 'kibana/server';
import documentFetch from './routes/document_fetch';

export class EnhancedTablePlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    documentFetch(router);
    // called when plugin is setting up during Kibana's startup sequence
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
