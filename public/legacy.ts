import { PluginInitializerContext  } from '../../../src/core/public';
import { npSetup, npStart } from 'ui/new_platform';
import { plugin } from '.';

import { TablePluginSetupDependencies } from './plugin';
import { TablePluginStartDependencies } from './plugin';

const plugins: Readonly<TablePluginSetupDependencies> = {
  visualizations: npSetup.plugins.visualizations,
};

const startData: Readonly<TablePluginStartDependencies> = {
  data: npStart.plugins.data
}

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, plugins);
export const start = pluginInstance.start(npStart.core, startData);
