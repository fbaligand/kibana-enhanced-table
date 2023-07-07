import './index.scss';
import { EnhancedTablePlugin as Plugin } from './plugin';

export function plugin() {
  return new Plugin();
}
