/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import { VisualizationsSetup, VisualizationsStart } from '../../../src/plugins/visualizations/public';

import { enhancedTableVisTypeDefinition } from './enhanced-table-vis';
import { documentTableVisTypeDefinition } from './document-table-vis';

import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { setFilterManager, setFormatService, setIndexPatterns, setKibanaLegacy, setNotifications, setQueryService, setSearchService, setVisualization } from './services';
import { KibanaLegacyStart } from '../../../src/plugins/kibana_legacy/public'; 
import { Plugin as ExpressionsPublicPlugin } from '../../../src/plugins/expressions/public';

import { getEnhancedTableVisLegacyRenderer } from './enh_table_vis_legacy_renderer';
import { enhancedTableExpressionFunction } from './enh_table_fn';
import { documentTableExpressionFunction } from './doc_table_fn';
import { getDocumentTableVisLegacyRenderer } from './doc_table_vis_legacy_renderer';




/** @internal */
export interface TablePluginSetupDependencies {
  visualizations: VisualizationsSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
}

/** @internal */
export interface TablePluginStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
  visualizations: VisualizationsStart;
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
    setKibanaLegacy(deps.kibanaLegacy);
    setNotifications(core.notifications);
    setQueryService(deps.data.query);
    setSearchService(deps.data.search);
    setIndexPatterns(deps.data.indexPatterns);
    setFilterManager(deps.data.query.filterManager);
    setVisualization(deps.visualizations)
  }
}
