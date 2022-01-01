import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { VisOptionsProps } from '../../../../src/plugins/vis_default_editor/public';
import { EnhancedTableVisParams } from './enhanced_table_vis_options';

const EnhancedTableOptionsComponent = lazy(() => import('./enhanced_table_vis_options'));

export const EnhancedTableOptions = (props: VisOptionsProps<EnhancedTableVisParams>) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <EnhancedTableOptionsComponent {...props} />
  </Suspense>
);
