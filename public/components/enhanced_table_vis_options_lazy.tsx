import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import type { EnhancedTableVisParams } from './enhanced_table_vis_options';

const EnhancedTableOptionsComponent = lazy(() => import('./enhanced_table_vis_options'));

export const EnhancedTableOptions = (props: VisEditorOptionsProps<EnhancedTableVisParams>) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <EnhancedTableOptionsComponent {...props} />
  </Suspense>
);
