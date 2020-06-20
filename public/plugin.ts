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
import { Plugin as ExpressionsPublicPlugin } from '../../../src/plugins/expressions/public';
import { VisualizationsSetup } from '../../../../src/legacy/core_plugins/visualizations/public';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';

import { createEnhancedVisualizationFn } from './data_load/enhanced-table-visualization-fn.ts';
import { enhancedTableVisTypeDefinition } from './enhanced-table-vis';
import { documentTableVisTypeDefinition } from './document-table-vis';

/** @internal */
export interface TablePluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export class EnhancedTablePlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations }: TablePluginSetupDependencies
  ) {
    expressions.registerFunction(createEnhancedVisualizationFn);

    visualizations.createBaseVisualization(enhancedTableVisTypeDefinition);
    visualizations.createBaseVisualization(documentTableVisTypeDefinition);
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
