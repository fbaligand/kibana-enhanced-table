import { IFieldFormat } from '../../../src/plugins/data/public';
import { DatatableColumn, DatatableRow } from '../../../src/plugins/expressions';
import { DocumentTableVisDataParams } from './components/document_table_vis_data';
import { EnhancedTableVisParams } from './components/enhanced_table_vis_options';

export const ENH_TABLE_VIS_NAME:VisName = 'enhanced-table';
export const DOC_TABLE_VIS_NAME:VisName = 'document_table';

export type VisName = string;

export interface ColumnWidthData {
  colIndex: number;
  width: number;
}

export interface TableVisUiState {
  sort: {
    columnIndex: number | null;
    direction: 'asc' | 'desc' | null;
  };
  colWidth: ColumnWidthData[];
}

export interface EnhancedTableVisUseUiStateProps {
  columnsWidth: TableVisUiState['colWidth'];
  sort: TableVisUiState['sort'];
  setSort: (s?: TableVisUiState['sort']) => void;
  setColumnsWidth: (column: ColumnWidthData) => void;
}

export interface EnhancedTableVisConfig extends EnhancedTableVisParams {
  title: string;
}

export interface DocumentTableVisConfig extends DocumentTableVisDataParams {
  title: string;
}

export interface FormattedColumn {
  title: string;
  formatter: IFieldFormat;
  formattedTotal?: string | number;
  filterable: boolean;
  sumTotal?: number;
  total?: number;
}

export interface FormattedColumns {
  [key: string]: FormattedColumn;
}

export interface EnhancedTableContext {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  formattedColumns: FormattedColumns;
}

export interface TableGroup {
  table: EnhancedTableContext;
  title: string;
}

export interface EnhancedTableVisData {
  table?: EnhancedTableContext;
  tables: TableGroup[];
  direction?: 'row' | 'column';
}
