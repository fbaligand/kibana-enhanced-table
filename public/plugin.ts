import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import { VisualizationsSetup } from '../../../src/plugins/visualizations/public';

import { enhancedTableVisTypeDefinition } from './enhanced-table-vis';
import { documentTableVisTypeDefinition } from './document-table-vis';

import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { setFormatService, setOpenSearchDashboardsLegacy, setNotifications, setQueryService, setSearchService } from './services';
import { OpenSearchDashboardsLegacyStart } from '../../../src/plugins/opensearch_dashboards_legacy/public';


/** @internal */
export interface TablePluginSetupDependencies {
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface TablePluginStartDependencies {
  data: DataPublicPluginStart;
  opensearchDashboardsLegacy: OpenSearchDashboardsLegacyStart;
}

/** @internal */
export class EnhancedTablePlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;
  createBaseVisualization: any;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { visualizations }: TablePluginSetupDependencies
  ) {
    visualizations.createBaseVisualization(
      enhancedTableVisTypeDefinition(core, this.initializerContext)
    );

    visualizations.createBaseVisualization(
      documentTableVisTypeDefinition(core, this.initializerContext)
      );
  }

  public start(core: CoreStart, { data, opensearchDashboardsLegacy }: TablePluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setOpenSearchDashboardsLegacy(opensearchDashboardsLegacy);
    setNotifications(core.notifications);
    setQueryService(data.query);
    setSearchService(data.search);
  }
}
