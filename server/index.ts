import { PluginInitializerContext } from 'kibana/server';
import { EnhancedTablePlugin as Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
