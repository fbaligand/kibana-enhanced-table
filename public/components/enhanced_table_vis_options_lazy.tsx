import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { EnhancedTableVisParams } from './enhanced_table_vis_options';

const EnhancedTableOptionsComponent = lazy(() => import('./enhanced_table_vis_options'));

export const EnhancedTableOptions = (props: VisEditorOptionsProps<EnhancedTableVisParams>) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <EnhancedTableOptionsComponent {...props} />
  </Suspense>
);
