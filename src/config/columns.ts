// Column Configuration
// Central source of truth for port table column definitions

export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  draggable: boolean;
  visible?: boolean;
}

// Column definitions for port tables
export const COLUMN_DEFS: Record<string, ColumnDef> = {
  anchor: { id: 'anchor', label: '', width: 'w-[24px]', draggable: false },
  delete: { id: 'delete', label: '🗑', width: 'w-[24px]', draggable: false },
  port: { id: 'port', label: 'Port', width: 'w-[52px]', draggable: true },
  connector: { id: 'connector', label: 'Connector', width: 'w-[90px]', draggable: true },
  resolution: { id: 'resolution', label: 'Resolution', width: 'w-[100px]', draggable: true },
  rate: { id: 'rate', label: 'Rate', width: 'w-[70px]', draggable: true },
  flip: { id: 'flip', label: '', width: 'w-[42px]', draggable: false },
  name: { id: 'name', label: 'Name', width: 'w-[80px]', draggable: true },
  destination: { id: 'destination', label: 'Dest', width: 'w-[80px]', draggable: true },
  source: { id: 'source', label: 'Source', width: 'w-[80px]', draggable: true },
};

// Data columns that can be reordered by dragging (default order)
export const DATA_COLUMNS = ['port', 'connector', 'resolution', 'rate'] as const;

export type DataColumnId = typeof DATA_COLUMNS[number];

// Build full column order based on mode
export const getFullColumnOrder = (
  dataOrder: string[],
  canToggleAnchor: boolean,
  isReversed: boolean
): string[] => {
  // Base order: anchor, delete, data columns, flip (if stacked)
  const baseOrder = canToggleAnchor
    ? ['anchor', 'delete', ...dataOrder, 'flip']
    : ['anchor', 'delete', ...dataOrder];

  // Reverse entire array if anchor is on right
  return isReversed ? [...baseOrder].reverse() : baseOrder;
};

// Helper to get column by ID
export const getColumnById = (id: string): ColumnDef | undefined => {
  return COLUMN_DEFS[id];
};

// Helper to get all draggable columns
export const getDraggableColumns = (): ColumnDef[] => {
  return Object.values(COLUMN_DEFS).filter(c => c.draggable);
};

// Size constants for consistent spacing
export const SIZES = {
  ANCHOR: 'w-3 h-3',        // 12px
  DELETE: 'w-4',            // 16px
  HANDLE: 'w-5',            // 20px
  GAP: 'gap-2',             // 8px
  PADDING_X: 'px-2',
  PADDING_Y: 'py-1.5',
} as const;
