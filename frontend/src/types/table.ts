export interface Column<T = any> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  sticky?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'boolean' | 'status' | 'badge' | 'action' | 'custom';
  format?: (value: any, row: T) => React.ReactNode;
  filter?: {
    type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
    options?: Array<{ value: any; label: string }>;
    placeholder?: string;
  };
  cell?: (props: CellProps<T>) => React.ReactNode;
  headerCell?: (props: HeaderCellProps<T>) => React.ReactNode;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
  aggregationFn?: (values: any[]) => any;
  hidden?: boolean;
  pinned?: boolean;
}

export interface CellProps<T = any> {
  value: any;
  row: T;
  column: Column<T>;
  rowIndex: number;
  columnIndex: number;
  isSelected: boolean;
  isEditing: boolean;
  onChange?: (value: any) => void;
}

export interface HeaderCellProps<T = any> {
  column: Column<T>;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnId: string) => void;
  onFilter?: (columnId: string, value: any) => void;
  onResize?: (columnId: string, width: number) => void;
  resizing?: boolean;
}

export interface TableState<T = any> {
  data: T[];
  filteredData: T[];
  selectedRows: Set<string | number>;
  editingCell?: { rowId: string | number; columnId: string };
  expandedRows: Set<string | number>;
  sorting: {
    columnId: string;
    direction: 'asc' | 'desc';
  }[];
  filters: Record<string, any>;
  pagination: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnSizing: Record<string, number>;
  globalFilter: string;
  density: 'compact' | 'normal' | 'comfortable';
  loading: boolean;
  error?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  keyField?: keyof T | string;
  height?: number | string;
  maxHeight?: number | string;
  virtualized?: boolean;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  selectable?: boolean | 'single' | 'multiple';
  expandable?: boolean;
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  density?: 'compact' | 'normal' | 'comfortable';
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  stickyHeader?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  exportable?: boolean;
  className?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T, index: number) => void;
  onRowDoubleClick?: (row: T, index: number) => void;
  onRowSelect?: (selectedRows: T[]) => void;
  onSort?: (sorting: TableState['sorting']) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onColumnResize?: (columnSizing: Record<string, number>) => void;
  onColumnReorder?: (columnOrder: string[]) => void;
  onEdit?: (rowId: string | number, columnId: string, value: any) => void;
  onExport?: (format: 'csv' | 'excel' | 'json') => void;
  rowActions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    disabled?: (row: T) => boolean;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  bulkActions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: T[]) => void;
    disabled?: (selectedRows: T[]) => boolean;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  toolbar?: {
    search?: boolean;
    filters?: boolean;
    density?: boolean;
    columns?: boolean;
    export?: boolean;
    refresh?: boolean;
    fullscreen?: boolean;
  };
  footer?: {
    pagination?: boolean;
    summary?: boolean;
    aggregations?: boolean;
  };
}

export interface FilterValue {
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
  value: any;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in' | 'notIn';
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
  priority?: number; // for multi-column sorting
}

export interface PaginationInfo {
  pageIndex: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TableExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  filename?: string;
  includeHeaders?: boolean;
  selectedOnly?: boolean;
  visibleColumnsOnly?: boolean;
  dateFormat?: string;
  delimiter?: string; // for CSV
}

export interface TableTheme {
  colors: {
    background: string;
    surface: string;
    border: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    header: {
      background: string;
      text: string;
      border: string;
    };
    row: {
      even: string;
      odd: string;
      hover: string;
      selected: string;
    };
    cell: {
      editing: string;
      error: string;
    };
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface VirtualTableProps<T = any> extends TableProps<T> {
  itemHeight: number;
  overscan?: number;
  scrollToIndex?: number;
  onScroll?: (scrollTop: number) => void;
}

export interface EditableTableProps<T = any> extends TableProps<T> {
  editMode?: 'cell' | 'row' | 'inline';
  validation?: Record<string, (value: any, row: T) => string | undefined>;
  onValidate?: (row: T) => Record<string, string | undefined>;
  onSave?: (row: T, changes: Partial<T>) => Promise<void>;
  onCancel?: (row: T) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface TreeTableProps<T = any> extends TableProps<T> {
  childrenField: keyof T;
  parentField?: keyof T;
  expandedByDefault?: boolean;
  indentSize?: number;
  onExpand?: (row: T, expanded: boolean) => void;
  renderExpander?: (props: {
    row: T;
    expanded: boolean;
    hasChildren: boolean;
    level: number;
    onToggle: () => void;
  }) => React.ReactNode;
}

export interface GroupedTableProps<T = any> extends TableProps<T> {
  groupBy: keyof T | ((row: T) => string);
  groupHeader?: (group: string, rows: T[]) => React.ReactNode;
  groupFooter?: (group: string, rows: T[]) => React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  sortGroups?: boolean;
}

export interface ServerSideTableProps<T = any> extends Omit<TableProps<T>, 'data'> {
  url: string;
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  transform?: (response: any) => { data: T[]; total: number };
  onRequest?: (params: {
    page: number;
    pageSize: number;
    sorting: SortConfig[];
    filters: Record<string, any>;
    search: string;
  }) => Promise<{ data: T[]; total: number }>;
  debounceMs?: number;
  cachingStrategy?: 'none' | 'memory' | 'sessionStorage' | 'localStorage';
  cacheTimeout?: number; // minutes
}

export interface TableColumnDef<T = any> {
  id: string;
  header: string | ((props: any) => React.ReactNode);
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: CellProps<T>) => React.ReactNode;
  footer?: string | ((props: any) => React.ReactNode);
  size?: number;
  minSize?: number;
  maxSize?: number;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableResizing?: boolean;
  enableHiding?: boolean;
  enablePinning?: boolean;
  enableGrouping?: boolean;
  meta?: {
    displayName?: string;
    description?: string;
    type?: Column['type'];
    required?: boolean;
    validation?: (value: any) => string | undefined;
  };
}