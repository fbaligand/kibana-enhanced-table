import { resolve } from 'path';
import { existsSync } from 'fs';

export default function (kibana) {

  return new kibana.Plugin({
    id: 'enhanced-table',
    uiExports: {
      visTypes: [
        'plugins/enhanced-table/enhanced-table-vis'
      ],
      hacks: [
        'plugins/enhanced-table/enhanced-table-vis-hack'
      ],
      styleSheetPaths: [resolve(__dirname, 'public/index.scss'), resolve(__dirname, 'public/index.css')].find(p => existsSync(p))
    }
  });

}
