import './index.scss';
import type { PluginInitializerContext } from '@kbn/core/public';
import { EnhancedTablePlugin as Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
