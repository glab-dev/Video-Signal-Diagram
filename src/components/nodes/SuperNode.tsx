import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { SuperNodeData, SuperNodePort, SectionId, LayoutRow } from '../../types';
import { useTheme, getThemeClasses } from '../../themes';

// Import from centralized config system
import {
  CONNECTOR_TYPES,
  RESOLUTIONS,
  REFRESH_RATES,
  SIGNAL_COLORS,
  SECTION_COLORS,
  PLATFORMS,
  SOFTWARE_PRESETS,
  CAPTURE_CARDS,
  CARD_PRESETS,
  COLUMN_DEFS,
  DATA_COLUMNS,
  SIZES,
  getFullColumnOrder,
} from '../../config';

// ============================================
// SIDE DROP ZONE COMPONENT
// Appears on left/right of sections when dragging
// ============================================

interface SideDropZoneProps {
  side: 'left' | 'right';
  onDrop: (side: 'left' | 'right') => void;
  isActive: boolean;
}

const SideDropZone = ({ side, onDrop, isActive }: SideDropZoneProps) => (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(side);
    }}
    onMouseDown={(e) => e.stopPropagation()}
    className={`nodrag nopan absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-12
      border-2 border-dashed transition-all z-50 flex items-center justify-center cursor-pointer
      ${isActive
        ? 'border-cyan-400 bg-cyan-400/30'
        : 'border-cyan-400/60 bg-cyan-400/10 hover:border-cyan-400 hover:bg-cyan-400/20'}`}
    style={{ pointerEvents: 'all' }}
  >
    <span className="text-cyan-400 text-[10px] font-bold">
      {side === 'left' ? '◀' : '▶'}
    </span>
  </div>
);

// ============================================
// ROW DROP ZONE COMPONENT
// Appears above/below rows when dragging SYSTEM to indicate new row placement
// ============================================

interface RowDropZoneProps {
  position: 'top' | 'bottom';
  onDrop: () => void;
}

const RowDropZone = ({ position, onDrop }: RowDropZoneProps) => (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop();
    }}
    onMouseDown={(e) => e.stopPropagation()}
    className="nodrag nopan w-full h-8 border-2 border-dashed border-purple-400 bg-purple-400/20
      flex items-center justify-center hover:bg-purple-400/40 transition-all cursor-pointer z-50"
    style={{ pointerEvents: 'all' }}
  >
    <span className="text-purple-300 text-[9px] font-bold">
      {position === 'top' ? '▲ DROP SYS HERE ▲' : '▼ DROP SYS HERE ▼'}
    </span>
  </div>
);

// ============================================
// BOTTOM DROP ZONE COMPONENT
// Appears at bottom when dragging to add new row
// ============================================

interface BottomDropZoneProps {
  onDrop: () => void;
}

const BottomDropZone = ({ onDrop }: BottomDropZoneProps) => (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop();
    }}
    onMouseDown={(e) => e.stopPropagation()}
    className="nodrag nopan w-full h-10 border-2 border-dashed border-cyan-400 bg-cyan-400/20
      flex items-center justify-center hover:bg-cyan-400/40 transition-all cursor-pointer z-50"
    style={{ pointerEvents: 'all' }}
  >
    <span className="text-cyan-300 text-[10px] font-bold">▼ DROP HERE FOR NEW ROW ▼</span>
  </div>
);

// ============================================
// ANCHOR COMPONENT (visual only - Handle is separate)
// ============================================

interface AnchorProps {
  type: 'in' | 'out';
  isActive?: boolean;
  signalColor?: string | null;
}

const Anchor = ({ type, isActive, signalColor }: AnchorProps) => {
  const isInput = type === 'in';
  const colorHex = signalColor ? SIGNAL_COLORS.find(c => c.id === signalColor)?.hex : null;

  return (
    <div
      className={`${SIZES.ANCHOR} border-2 transition-all hover:scale-125 shrink-0
        ${isInput ? 'rounded-sm' : 'rounded-full'}
        ${isActive
          ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/50'
          : isInput
            ? 'bg-zinc-800 border-emerald-500 hover:bg-emerald-500/20'
            : 'bg-zinc-800 border-amber-500 hover:bg-amber-500/20'
        }`}
      style={colorHex && !isInput ? { borderColor: colorHex, boxShadow: `0 0 8px ${colorHex}50` } : {}}
      title={isInput ? 'Input - click to connect' : 'Output - click to connect'}
    />
  );
};

// ============================================
// DELETE BUTTON COMPONENT
// ============================================

interface DeleteButtonProps {
  onClick?: () => void;
}

const DeleteButton = ({ onClick }: DeleteButtonProps) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick && onClick();
    }}
    className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ${SIZES.DELETE} shrink-0 text-center`}
  >
    ×
  </button>
);

// ============================================
// PORT ROW COMPONENT
// Unified column structure - matches ColumnHeaders exactly
// ALL columns render in same order with markers between
// ============================================

interface PortRowProps {
  port: SuperNodePort;
  type: 'in' | 'out';
  anchorSide: 'left' | 'right';
  onUpdate: (updates: Partial<SuperNodePort>) => void;
  onDelete: () => void;
  anchorId: string;
  isActive?: boolean;
  signalColor?: string | null;
  canToggleAnchor: boolean;
  onToggleAnchor?: () => void;
  columnOrder: string[];
}

const PortRow = ({
  port,
  type,
  anchorSide,
  onUpdate,
  onDelete,
  anchorId,
  isActive,
  signalColor,
  canToggleAnchor,
  onToggleAnchor,
  columnOrder,
}: PortRowProps) => {
  const isInput = type === 'in';
  const isReversed = anchorSide === 'right';
  const colors = SECTION_COLORS[isInput ? 'input' : 'output'];

  // Use provided columnOrder or default
  const dataOrder = columnOrder || [...DATA_COLUMNS];

  // Get full column order (anchor, delete, data, flip) with proper reversal - SAME as ColumnHeaders
  const fullColumnOrder = getFullColumnOrder(dataOrder, canToggleAnchor, isReversed);

  // Render column content based on column ID
  const renderColumnContent = (colId: string) => {
    const colDef = COLUMN_DEFS[colId];
    if (!colDef) return null;

    switch (colId) {
      case 'anchor':
        return (
          <div className="relative">
            <Anchor
              type={type}
              isActive={isActive}
              signalColor={type === 'out' ? signalColor : null}
            />
            {/* React Flow Handle overlaid on anchor */}
            <Handle
              type={isInput ? 'target' : 'source'}
              position={anchorSide === 'left' ? Position.Left : Position.Right}
              id={anchorId}
              className="!absolute !w-3 !h-3 !opacity-0"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                [anchorSide]: '-6px',
              }}
            />
          </div>
        );
      case 'delete':
        return <DeleteButton onClick={onDelete} />;
      case 'flip':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAnchor && onToggleAnchor();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`px-1.5 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[9px] font-mono ${colors.text}`}
            title={`Anchors on ${anchorSide} side - click to toggle`}
          >
            {anchorSide === 'right' ? '■ ▶' : '◀ ■'}
          </button>
        );
      case 'port':
        return (
          <span className="font-mono text-zinc-400 text-center w-full">
            {isInput ? 'IN' : 'OUT'} {port.number}
          </span>
        );
      case 'connector':
        return (
          <select
            value={port.connector || 'HDMI'}
            onChange={(e) => onUpdate({ connector: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] w-full"
          >
            {CONNECTOR_TYPES.map(conn => (
              <option key={conn} value={conn}>{conn}</option>
            ))}
          </select>
        );
      case 'resolution':
        return (
          <select
            value={port.resolution}
            onChange={(e) => onUpdate({ resolution: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] w-full"
          >
            {RESOLUTIONS.map(res => (
              <option key={res} value={res}>{res}</option>
            ))}
          </select>
        );
      case 'rate':
        return (
          <select
            value={port.refreshRate}
            onChange={(e) => onUpdate({ refreshRate: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] w-full"
          >
            {REFRESH_RATES.map(rate => (
              <option key={rate} value={rate}>{rate}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center ${SIZES.PADDING_Y} hover:bg-zinc-800/50 group text-[11px] whitespace-nowrap w-full`}>
      {fullColumnOrder.map((colId, index) => {
        const colDef = COLUMN_DEFS[colId];
        if (!colDef) return null;

        return (
          <div key={colId} className="flex items-center">
            {/* Marker between ALL columns (except first) - matches ColumnHeaders */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0" />
            )}
            <span className={`${colDef.width} shrink-0 flex items-center justify-center`}>
              {renderColumnContent(colId)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// COLUMN HEADERS COMPONENT
// Unified column structure - matches PortRow exactly
// ============================================

interface ColumnHeadersProps {
  anchorSide: 'left' | 'right';
  canToggleAnchor: boolean;
  columnOrder: string[];
  onReorderColumns: (newOrder: string[]) => void;
}

const ColumnHeaders = ({ anchorSide, canToggleAnchor, columnOrder, onReorderColumns }: ColumnHeadersProps) => {
  const isReversed = anchorSide === 'right';
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Use provided columnOrder or default
  const dataOrder = columnOrder || [...DATA_COLUMNS];

  // Get full column order (anchor, delete, data, flip) with proper reversal
  const fullColumnOrder = getFullColumnOrder(dataOrder, canToggleAnchor, isReversed);

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColumn(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColId || !onReorderColumns) {
      setDraggedColumn(null);
      return;
    }

    // Work with base data order (not reversed, not including anchor/delete/flip)
    const newOrder = [...dataOrder];
    const dragIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColId);

    if (dragIdx === -1 || targetIdx === -1) {
      setDraggedColumn(null);
      return;
    }

    newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    onReorderColumns(newOrder);
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  return (
    <div className={`flex items-center py-1 bg-zinc-800/30 border-b border-zinc-700/30
        text-[9px] font-mono text-zinc-500 uppercase tracking-wide w-full`}
    >
      {fullColumnOrder.map((colId, index) => {
        const colDef = COLUMN_DEFS[colId];
        if (!colDef) return null;

        const isDragging = draggedColumn === colId;
        const isDraggable = colDef.draggable && !!colDef.label;

        return (
          <div
            key={colId}
            className="flex items-center"
            onDragOver={(e) => {
              if (isDraggable) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onDrop={(e) => isDraggable && handleDrop(e, colId)}
          >
            {/* Marker between ALL columns (except first) */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0" />
            )}
            <span
              draggable={isDraggable}
              onMouseDown={(e) => isDraggable && e.stopPropagation()}
              onDragStart={(e) => isDraggable && handleDragStart(e, colId)}
              onDragEnd={handleDragEnd}
              className={`${colDef.width} shrink-0 flex items-center justify-center transition-opacity
                ${isDraggable ? 'cursor-grab select-none hover:text-zinc-300' : ''}
                ${isDragging ? 'opacity-50' : ''}`}
              title={isDraggable ? "Drag to reorder" : undefined}
            >
              {colDef.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// DRAGGABLE SECTION WRAPPER
// Wraps sections with drag handle and drop zones
// ============================================

interface DraggableSectionProps {
  sectionId: SectionId;
  children: React.ReactNode;
  anchorSide: 'left' | 'right';
  onDragStart: (e: React.DragEvent, sectionId: SectionId) => void;
  onDragOver: (e: React.DragEvent, sectionId: SectionId) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, sectionId: SectionId) => void;
  onDropToSide: (targetSectionId: SectionId, side: 'left' | 'right') => void;
  isDraggedOver: boolean;
  isDragging: boolean;
  showSideDropZones: boolean;
  isSingleSectionRow: boolean;
}

const DraggableSection = ({
  sectionId,
  children,
  onDragOver,
  onDrop,
  onDropToSide,
  isDraggedOver,
  isDragging,
  showSideDropZones,
}: DraggableSectionProps) => {
  // System sections never show side drop zones (system always in own row)
  const isSystemSection = sectionId === 'system';
  const canShowSideZones = showSideDropZones && !isSystemSection;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e, sectionId);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, sectionId);
      }}
      className={`
        relative w-full
        transition-all duration-150
        ${isDragging ? 'opacity-40' : ''}
        ${isDraggedOver ? 'ring-2 ring-cyan-400 ring-inset' : ''}
      `}
    >
      {/* Side drop zones - only for INPUT/OUTPUT sections (system never side-by-side) */}
      {canShowSideZones && (
        <>
          <SideDropZone
            side="left"
            onDrop={(side) => onDropToSide(sectionId, side)}
            isActive={isDraggedOver}
          />
          <SideDropZone
            side="right"
            onDrop={(side) => onDropToSide(sectionId, side)}
            isActive={isDraggedOver}
          />
        </>
      )}

      {/* Content takes full width - drag handle moved to header text */}
      <div className="w-full">{children}</div>
    </div>
  );
};

// ============================================
// SECTION HEADER COMPONENT
// Template: Title on anchor side, + button centered
// ============================================

interface SectionHeaderProps {
  type: 'input' | 'output';
  title: string;
  anchorSide: 'left' | 'right';
  onAdd?: () => void;
  onTitleChange?: (value: string) => void;
  onDragStart?: (e: React.DragEvent, sectionId: SectionId) => void;
  onDragEnd?: () => void;
  sectionId: SectionId;
  onApplyPreset?: (ports: { connector: string; resolution: string; refreshRate: string }[]) => void;
}

const SectionHeader = ({
  type,
  title,
  anchorSide,
  onAdd,
  onDragStart,
  onDragEnd,
  sectionId,
  onApplyPreset,
}: SectionHeaderProps) => {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const { theme } = useTheme();
  const tc = getThemeClasses(theme);
  const isReversed = anchorSide === 'right';

  // Get theme-aware section classes
  const sectionClass = type === 'input' ? tc.sectionInput : tc.sectionOutput;
  const textClass = type === 'input' ? tc.sectionInputText : tc.sectionOutputText;

  // Filter presets by section type (input/output)
  const availablePresets = Object.entries(CARD_PRESETS)
    .filter(([, preset]) => preset.category === type)
    .map(([presetId, preset]) => ({ ...preset, id: presetId }));

  const handlePresetSelect = (presetId: string) => {
    const preset = CARD_PRESETS[presetId];
    if (preset && onApplyPreset) {
      onApplyPreset(preset.ports);
    }
    setShowPresetMenu(false);
  };

  return (
    <div
      className={`${sectionClass} flex items-center ${SIZES.PADDING_X} py-1`}
    >
      {/* Left side - title when anchor is left, spacer when anchor is right */}
      <div className="flex-1 min-w-0">
        {!isReversed && (
          <span className={`${textClass} font-mono font-bold text-[11px]`}>
            {title}
          </span>
        )}
      </div>

      {/* Center - Drag handle, Card preset button, and Add button */}
      <div className="flex items-center gap-1 shrink-0 relative">
        {/* Drag handle */}
        <span
          draggable
          onDragStart={(e) => onDragStart && onDragStart(e, sectionId)}
          onDragEnd={onDragEnd}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${tc.button} nodrag nopan px-1 py-0.5 rounded text-[10px] cursor-grab select-none ${textClass}`}
          title="Drag to reorder section"
        >
          ⋮⋮
        </span>

        {/* Card preset button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPresetMenu(!showPresetMenu);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${tc.button} px-1.5 py-0.5 rounded text-[10px] font-mono ${textClass}`}
          title="Load card preset"
        >
          ⊞
        </button>

        {/* Preset dropdown menu */}
        {showPresetMenu && (
          <div
            className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-50 min-w-[180px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[9px] text-zinc-500 border-b border-zinc-700 font-mono">
              CARD PRESETS
            </div>
            {availablePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetSelect(preset.id);
                }}
                className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
              >
                <span className="text-zinc-500">{preset.ports.length}p</span>
                <span>{preset.label}</span>
              </button>
            ))}
            {availablePresets.length === 0 && (
              <div className="px-2 py-1.5 text-[10px] font-mono text-zinc-500">
                No presets available
              </div>
            )}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd && onAdd();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${tc.button} px-2 py-0.5 rounded text-[10px] font-mono ${textClass}`}
          title="Add port"
        >
          +
        </button>
      </div>

      {/* Right side - title when anchor is right, spacer when anchor is left */}
      <div className="flex-1 min-w-0 text-right">
        {isReversed && (
          <span className={`${textClass} font-mono font-bold text-[11px]`}>
            {title}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// IO SECTION COMPONENT (Input or Output)
// ============================================

interface IOSectionProps {
  type: 'input' | 'output';
  data: { ports: SuperNodePort[]; columnName: string; columnOrder?: string[] };
  anchorSide: 'left' | 'right';
  nodeId: string;
  onUpdate: (updates: Partial<{ ports: SuperNodePort[]; columnName: string; columnOrder?: string[] }>) => void;
  signalColor?: string | null;
  canToggleAnchor: boolean;
  onToggleAnchorSide?: () => void;
  onSectionDragStart?: (e: React.DragEvent, sectionId: SectionId) => void;
  onSectionDragEnd?: () => void;
}

const IOSection = ({
  type,
  data,
  anchorSide,
  nodeId,
  onUpdate,
  signalColor,
  canToggleAnchor,
  onToggleAnchorSide,
  onSectionDragStart,
  onSectionDragEnd,
}: IOSectionProps) => {
  const sectionType = type === 'input' ? 'input' : 'output';
  const sectionId: SectionId = type === 'input' ? 'input' : 'output';
  const portType = type === 'input' ? 'in' : 'out';

  const addPort = () => {
    const prefix = type === 'input' ? 'in' : 'out';
    const newPort: SuperNodePort = {
      id: `${prefix}-${Date.now()}`,
      number: data.ports.length + 1,
      connector: 'HDMI',
      resolution: '1920x1080',
      refreshRate: '59.94'
    };
    onUpdate({ ports: [...data.ports, newPort] });
  };

  const updatePort = (portId: string, updates: Partial<SuperNodePort>) => {
    onUpdate({
      ports: data.ports.map(p => p.id === portId ? { ...p, ...updates } : p)
    });
  };

  const deletePort = (portId: string) => {
    onUpdate({
      ports: data.ports.filter(p => p.id !== portId).map((p, i) => ({ ...p, number: i + 1 }))
    });
  };

  const reorderColumns = (newOrder: string[]) => {
    onUpdate({ columnOrder: newOrder });
  };

  // Apply a preset (replaces all ports with preset configuration)
  const applyPreset = (presetPorts: { connector: string; resolution: string; refreshRate: string }[]) => {
    const prefix = type === 'input' ? 'in' : 'out';
    const newPorts: SuperNodePort[] = presetPorts.map((p, i) => ({
      id: `${prefix}-${Date.now()}-${i}`,
      number: i + 1,
      connector: p.connector,
      resolution: p.resolution,
      refreshRate: p.refreshRate,
    }));
    onUpdate({ ports: newPorts });
  };

  // Get column order from data or use default
  const columnOrder = data.columnOrder || [...DATA_COLUMNS];

  return (
    <div className="flex flex-col w-full border-t border-zinc-700/50">
      <SectionHeader
        type={sectionType}
        title={data.columnName}
        anchorSide={anchorSide}
        onAdd={addPort}
        onTitleChange={(value) => onUpdate({ columnName: value })}
        onDragStart={onSectionDragStart}
        onDragEnd={onSectionDragEnd}
        sectionId={sectionId}
        onApplyPreset={applyPreset}
      />

      {data.ports.length > 0 && (
        <ColumnHeaders
          anchorSide={anchorSide}
          canToggleAnchor={canToggleAnchor}
          columnOrder={columnOrder}
          onReorderColumns={reorderColumns}
        />
      )}

      <div className="flex-1 w-full">
        {data.ports.length === 0 ? (
          <div className={`${SIZES.PADDING_X} py-2 text-zinc-600 font-mono italic text-[10px]`}>
            No {type}s
          </div>
        ) : (
          data.ports.map(port => (
            <PortRow
              key={port.id}
              port={port}
              type={portType}
              anchorSide={anchorSide}
              onUpdate={(updates) => updatePort(port.id, updates)}
              onDelete={() => deletePort(port.id)}
              anchorId={`${nodeId}-${port.id}`}
              signalColor={type === 'output' ? signalColor : null}
              canToggleAnchor={canToggleAnchor}
              onToggleAnchor={onToggleAnchorSide}
              columnOrder={columnOrder}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================
// SYSTEM SECTION COMPONENT
// ============================================

interface SystemSectionProps {
  data: { platform: string; software: string; captureCard: string };
  onUpdate: (updates: Partial<{ platform: string; software: string; captureCard: string }>) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSectionDragStart?: (e: React.DragEvent, sectionId: SectionId) => void;
  onSectionDragEnd?: () => void;
}

const SystemSection = ({
  data,
  onUpdate,
  collapsed,
  onToggleCollapse,
  onSectionDragStart,
  onSectionDragEnd,
}: SystemSectionProps) => {
  const { theme } = useTheme();
  const tc = getThemeClasses(theme);

  return (
    <div className={`${tc.sectionSystem} flex flex-col`}>
      {/* Header with collapse toggle */}
      <div
        className="flex items-center px-2 py-0.5 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse && onToggleCollapse();
        }}
      >
        {/* Left side - title */}
        <span className={`${tc.sectionSystemText} font-mono font-bold text-[9px] flex-1`}>
          SYS
        </span>

        {/* Center - Drag handle */}
        <span
          draggable
          onDragStart={(e) => onSectionDragStart && onSectionDragStart(e, 'system')}
          onDragEnd={onSectionDragEnd}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`${tc.button} ${tc.sectionSystemText} nodrag nopan px-1 py-0.5 rounded text-[10px] cursor-grab select-none mx-1`}
          title="Drag to reorder section"
        >
          ⋮⋮
        </span>

        {/* Right side - Collapse toggle */}
        <span
          className={`${tc.sectionSystemText} text-[8px] flex-1 text-right`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse && onToggleCollapse();
          }}
        >
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Platform</span>
            <select
              value={data.platform || 'MacBook Pro'}
              onChange={(e) => onUpdate({ platform: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Software</span>
            <select
              value={data.software || 'none'}
              onChange={(e) => onUpdate({ software: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {SOFTWARE_PRESETS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Capture Card</span>
            <select
              value={data.captureCard || 'none'}
              onChange={(e) => onUpdate({ captureCard: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {CAPTURE_CARDS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// TITLE BAR COMPONENT
// ============================================

interface TitleBarProps {
  data: SuperNodeData;
  onUpdate: (updates: Partial<SuperNodeData>) => void;
  onDelete: () => void;
}

const TitleBar = ({ data, onUpdate, onDelete }: TitleBarProps) => {
  const { theme } = useTheme();
  const tc = getThemeClasses(theme);

  const signalColorHex = data.signalColor
    ? SIGNAL_COLORS.find(c => c.id === data.signalColor)?.hex
    : null;

  const getSoftwareLabel = () => {
    const softwareId = data.system?.software;
    if (!softwareId || softwareId === 'none') return null;
    const software = SOFTWARE_PRESETS.find(s => s.id === softwareId);
    return software ? software.label : null;
  };

  const displayTitle = () => {
    const softwareLabel = getSoftwareLabel();
    if (softwareLabel) {
      return `${softwareLabel} ${data.label}`.toUpperCase();
    }
    return data.label;
  };

  return (
    <div
      className={`${tc.titlebar} flex items-center gap-2 px-3 py-2`}
      style={{ borderLeft: signalColorHex ? `4px solid ${signalColorHex}` : undefined }}
    >
      <span className={`${tc.titlebarText} font-mono font-bold text-sm`}>{displayTitle()}</span>
      <input
        type="text"
        value={data.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        className="bg-transparent font-mono focus:outline-none text-[10px] w-20 opacity-50 hover:opacity-100"
        style={{ color: 'inherit' }}
        title="Edit device name"
        placeholder="Device"
      />

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {/* Signal color picker */}
        <select
          value={data.signalColor || ''}
          onChange={(e) => onUpdate({ signalColor: e.target.value || undefined })}
          onClick={(e) => e.stopPropagation()}
          className={`${tc.select} rounded px-1 py-0.5 text-[9px]`}
          title="Signal color"
          style={{ color: signalColorHex || undefined }}
        >
          <option value="">No Color</option>
          {SIGNAL_COLORS.map(color => (
            <option key={color.id} value={color.id} style={{ color: color.hex }}>
              ● {color.label}
            </option>
          ))}
        </select>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-400 hover:text-red-300 ml-1 text-sm font-bold"
          title="Delete node"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ============================================
// SUPERNODE COMPONENT
// ============================================

// ============================================
// RESIZE HANDLE COMPONENT
// Blue dot in bottom-right corner for scaling
// ============================================

interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void;
}

const ResizeHandle = ({ onResizeStart }: ResizeHandleProps) => {
  const { theme } = useTheme();
  const tc = getThemeClasses(theme);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 12,
        height: 12,
        borderRadius: '50%',
        cursor: 'nwse-resize',
        zIndex: 20,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onResizeStart(e);
      }}
      className={`${tc.resize} nodrag nopan hover:opacity-100 hover:scale-110 transition-all`}
    />
  );
};

type SuperNodeProps = NodeProps & {
  data: SuperNodeData;
};

function SuperNode({ id, data, selected }: SuperNodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeRef = useRef<HTMLDivElement>(null);

  // Get current theme
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Section drag state
  const [draggedSection, setDraggedSection] = useState<SectionId | null>(null);
  const [dragOverSection, setDragOverSection] = useState<SectionId | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1 });

  // Get scale from data (default 1)
  const nodeScale = (data as SuperNodeData & { scale?: number }).scale || 1;

  // Get rows from layout (default: all sections stacked)
  const getRows = useCallback((): LayoutRow[] => {
    if (data.layout?.rows) {
      return data.layout.rows;
    }
    // Fallback: default layout
    return [['system'], ['input'], ['output']];
  }, [data.layout?.rows]);

  const layoutRows = getRows();

  // Update node internals when handles change
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data.inputSection?.ports, data.outputSection?.ports, data.layout, updateNodeInternals]);

  // Update helpers
  const handleUpdate = useCallback((updates: Partial<SuperNodeData>) => {
    updateNodeData(id, updates);
  }, [id, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, scale: nodeScale });
  }, [nodeScale]);

  // Resize mouse move/up effect
  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const scaleDelta = (deltaX + deltaY) / 400;
      const newScale = Math.max(0.5, Math.min(2.0, resizeStart.scale + scaleDelta));
      updateNodeData(id, { scale: newScale } as Partial<SuperNodeData>);
    };

    const handleResizeEnd = () => setIsResizing(false);

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeStart, id, updateNodeData]);

  // Section drag handlers
  const handleSectionDragStart = useCallback((e: React.DragEvent, sectionId: SectionId) => {
    e.stopPropagation();
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  }, []);

  const handleSectionDragOver = useCallback((e: React.DragEvent, sectionId: SectionId) => {
    // Only handle if we're actually dragging a section (not a column header)
    if (!draggedSection) return;

    e.preventDefault();
    e.stopPropagation();

    // Don't highlight sections in multi-section rows when dragging SYSTEM
    // The RowDropZone provides the visual feedback instead
    if (draggedSection === 'system') {
      const targetRow = layoutRows.find(row => row.includes(sectionId));
      if (targetRow && targetRow.length > 1) {
        setDragOverSection(null);
        return;
      }
    }

    if (draggedSection !== sectionId) {
      setDragOverSection(sectionId);
    }
  }, [draggedSection, layoutRows]);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSection(null);
    setDragOverSection(null);
  }, []);

  // Drop on section (swap positions in same row or move to different row)
  // CONSTRAINT: System can only be at TOP or BOTTOM (never middle, never side-by-side)
  const handleSectionDrop = useCallback((e: React.DragEvent, targetSectionId: SectionId) => {
    // Only handle if we're actually dragging a section (not a column header)
    if (!draggedSection) return;

    e.preventDefault();
    e.stopPropagation();

    if (draggedSection === targetSectionId) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    const newRows = layoutRows.map(row => [...row]);

    // Find positions
    let draggedRowIdx = -1, draggedColIdx = -1;
    let targetRowIdx = -1, targetColIdx = -1;

    newRows.forEach((row, ri) => {
      row.forEach((sid, ci) => {
        if (sid === draggedSection) { draggedRowIdx = ri; draggedColIdx = ci; }
        if (sid === targetSectionId) { targetRowIdx = ri; targetColIdx = ci; }
      });
    });

    if (draggedRowIdx === -1 || targetRowIdx === -1) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    const targetRowHasMultipleSections = newRows[targetRowIdx].filter(s => s !== null).length > 1;
    const draggedRowHasMultipleSections = newRows[draggedRowIdx].filter(s => s !== null).length > 1;

    // SPECIAL CASE: Dragging SYSTEM when target is in a side-by-side row
    // System can't go into a multi-section row, so just move it to top/bottom
    if (draggedSection === 'system' && targetRowHasMultipleSections) {
      // Remove system from current position
      newRows[draggedRowIdx][draggedColIdx] = null as unknown as SectionId;

      // Clean up
      let cleanedRows = newRows
        .map(row => row.filter(s => s !== null))
        .filter(row => row.length > 0);

      // Add system to top or bottom based on target position
      if (targetRowIdx <= draggedRowIdx) {
        cleanedRows.unshift(['system']); // Moving toward top
      } else {
        cleanedRows.push(['system']); // Moving toward bottom
      }

      handleUpdate({ layout: { ...data.layout, rows: cleanedRows } });
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // SPECIAL CASE: Dropping onto SYSTEM when dragged section is in side-by-side row
    // Just move the dragged section to its own row near system
    if (targetSectionId === 'system' && draggedRowHasMultipleSections) {
      // Remove dragged section from current position
      newRows[draggedRowIdx][draggedColIdx] = null as unknown as SectionId;

      // Clean up
      let cleanedRows = newRows
        .map(row => row.filter(s => s !== null))
        .filter(row => row.length > 0);

      // Find where system is now and insert the dragged section appropriately
      const systemIdx = cleanedRows.findIndex(row => row.includes('system'));
      if (systemIdx === 0) {
        // System at top, insert dragged section below it
        cleanedRows.splice(1, 0, [draggedSection]);
      } else {
        // System at bottom, insert dragged section above it
        cleanedRows.splice(systemIdx, 0, [draggedSection]);
      }

      handleUpdate({ layout: { ...data.layout, rows: cleanedRows } });
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // Normal swap for single-section rows
    newRows[draggedRowIdx][draggedColIdx] = targetSectionId;
    newRows[targetRowIdx][targetColIdx] = draggedSection;

    // Clean up empty rows
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // CONSTRAINT: Ensure system is at top or bottom (never middle)
    const systemRowIdx = cleanedRows.findIndex(row => row.includes('system'));
    if (systemRowIdx > 0 && systemRowIdx < cleanedRows.length - 1) {
      // System is in the middle - move it to top or bottom based on drag direction
      const systemRow = cleanedRows.splice(systemRowIdx, 1)[0];
      if (targetRowIdx < draggedRowIdx) {
        cleanedRows.unshift(systemRow); // Moving up → go to top
      } else {
        cleanedRows.push(systemRow); // Moving down → go to bottom
      }
    }

    // CONSTRAINT: System should never be side-by-side (extra safety check)
    const systemRowIdxFinal = cleanedRows.findIndex(row => row.includes('system'));
    if (systemRowIdxFinal !== -1 && cleanedRows[systemRowIdxFinal].length > 1) {
      // Extract system to its own row
      const systemRow = cleanedRows[systemRowIdxFinal];
      const otherSections = systemRow.filter(s => s !== 'system');
      cleanedRows[systemRowIdxFinal] = otherSections as LayoutRow;
      // Add system back as its own row at bottom
      cleanedRows.push(['system']);
      // Clean up any empty rows
      cleanedRows = cleanedRows.filter(row => row.length > 0);
    }

    handleUpdate({ layout: { ...data.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, data.layout, handleUpdate]);

  // Drop to side (create or join column)
  // CONSTRAINT: System can never be side-by-side (only INPUT/OUTPUT can share a row)
  const handleDropToSide = useCallback((targetSectionId: SectionId, side: 'left' | 'right') => {
    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    // Reject: System cannot go side-by-side with anything
    if (draggedSection === 'system' || targetSectionId === 'system') {
      setDraggedSection(null);
      return;
    }

    const newRows = layoutRows.map(row => [...row]);

    // Find positions
    let draggedRowIdx = -1, draggedColIdx = -1;
    let targetRowIdx = -1;

    newRows.forEach((row, ri) => {
      row.forEach((sid, ci) => {
        if (sid === draggedSection) { draggedRowIdx = ri; draggedColIdx = ci; }
        if (sid === targetSectionId) { targetRowIdx = ri; }
      });
    });

    if (draggedRowIdx === -1 || targetRowIdx === -1) {
      setDraggedSection(null);
      return;
    }

    // Remove dragged section from its current position
    newRows[draggedRowIdx][draggedColIdx] = null as unknown as SectionId;

    // Check target row
    const targetRow = newRows[targetRowIdx];
    const targetSectionsCount = targetRow.filter(Boolean).length;

    if (targetSectionsCount === 2) {
      // Row already has 2 sections - swap with the one at the drop position
      const swapColIdx = side === 'left' ? 0 : 1;
      const swappedSection = targetRow[swapColIdx];

      // Put dragged section in the swap position
      targetRow[swapColIdx] = draggedSection;

      // Put swapped section where dragged came from
      newRows[draggedRowIdx][draggedColIdx] = swappedSection;
    } else {
      // Row has 1 section - add dragged section to create columns
      if (side === 'left') {
        // Insert at beginning
        targetRow.unshift(draggedSection);
      } else {
        // Add at end
        targetRow.push(draggedSection);
      }

      // Ensure max 2
      while (targetRow.length > 2) {
        targetRow.pop();
      }
    }

    // Clean up: remove nulls and empty rows
    const cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    handleUpdate({ layout: { ...data.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, data.layout, handleUpdate]);

  // Drop to bottom (create new row at bottom)
  // CONSTRAINT: System always goes to very bottom; IO inserts above system if system is at bottom
  const handleDropToBottom = useCallback(() => {
    if (!draggedSection) return;

    const newRows = layoutRows.map(row => [...row]);

    // Find and remove dragged section from its current position
    newRows.forEach((row) => {
      const idx = row.indexOf(draggedSection);
      if (idx !== -1) {
        row[idx] = null as unknown as SectionId;
      }
    });

    // Clean up nulls first
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // If dragging system, it goes to very bottom
    if (draggedSection === 'system') {
      cleanedRows.push([draggedSection]);
    } else {
      // IO section: check if system is at bottom - if so, insert ABOVE it
      const lastRow = cleanedRows[cleanedRows.length - 1];
      if (lastRow && lastRow.includes('system')) {
        cleanedRows.splice(cleanedRows.length - 1, 0, [draggedSection]);
      } else {
        cleanedRows.push([draggedSection]);
      }
    }

    handleUpdate({ layout: { ...data.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, data.layout, handleUpdate]);

  // Drop to top (create new row at top)
  const handleDropToTop = useCallback(() => {
    if (!draggedSection) return;

    const newRows = layoutRows.map(row => [...row]);

    // Remove dragged section from current position
    newRows.forEach((row) => {
      const idx = row.indexOf(draggedSection);
      if (idx !== -1) row[idx] = null as unknown as SectionId;
    });

    // Clean up
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // Add to top
    cleanedRows.unshift([draggedSection]);

    handleUpdate({ layout: { ...data.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, data.layout, handleUpdate]);

  // Get anchor side for a section based on its position
  const getAnchorSide = useCallback((sectionId: SectionId, _rowIndex: number, colIndex: number, isSingleSectionRow: boolean): 'left' | 'right' => {
    if (!isSingleSectionRow) {
      // In columns: left col = left anchors, right col = right anchors
      return colIndex === 0 ? 'left' : 'right';
    }
    // Single section row: use stored preference
    if (sectionId === 'input') return data.layout?.inputAnchorSide || 'left';
    if (sectionId === 'output') return data.layout?.outputAnchorSide || 'right';
    return 'left';
  }, [data.layout?.inputAnchorSide, data.layout?.outputAnchorSide]);

  // Check if two sections are in the same row (side-by-side)
  const areInSameRow = useCallback((section1: SectionId, section2: SectionId): boolean => {
    return layoutRows.some(row => row.includes(section1) && row.includes(section2));
  }, [layoutRows]);

  // Anchor side toggles
  const toggleInputAnchorSide = useCallback(() => {
    handleUpdate({
      layout: {
        ...data.layout,
        inputAnchorSide: data.layout?.inputAnchorSide === 'right' ? 'left' : 'right'
      }
    });
  }, [data.layout, handleUpdate]);

  const toggleOutputAnchorSide = useCallback(() => {
    handleUpdate({
      layout: {
        ...data.layout,
        outputAnchorSide: data.layout?.outputAnchorSide === 'left' ? 'right' : 'left'
      }
    });
  }, [data.layout, handleUpdate]);

  // Render section content
  const renderSectionContent = useCallback((sectionId: SectionId, anchorSide: 'left' | 'right', canToggleAnchor: boolean) => {
    switch (sectionId) {
      case 'system':
        return (
          <SystemSection
            data={data.system}
            onUpdate={(updates) => handleUpdate({ system: { ...data.system, ...updates } })}
            collapsed={data.layout?.systemCollapsed}
            onToggleCollapse={() => handleUpdate({ layout: { ...data.layout, systemCollapsed: !data.layout?.systemCollapsed } })}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
          />
        );
      case 'input':
        return (
          <IOSection
            type="input"
            data={data.inputSection}
            anchorSide={anchorSide}
            nodeId={id}
            onUpdate={(updates) => handleUpdate({ inputSection: { ...data.inputSection, ...updates } })}
            canToggleAnchor={canToggleAnchor}
            onToggleAnchorSide={toggleInputAnchorSide}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
          />
        );
      case 'output':
        return (
          <IOSection
            type="output"
            data={data.outputSection}
            anchorSide={anchorSide}
            nodeId={id}
            onUpdate={(updates) => handleUpdate({ outputSection: { ...data.outputSection, ...updates } })}
            signalColor={data.signalColor}
            canToggleAnchor={canToggleAnchor}
            onToggleAnchorSide={toggleOutputAnchorSide}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
          />
        );
      default:
        return null;
    }
  }, [id, data, handleUpdate, handleSectionDragStart, handleSectionDragEnd, toggleInputAnchorSide, toggleOutputAnchorSide]);

  return (
    <div
      ref={nodeRef}
      className={`${selected ? themeClasses.nodeSelected : themeClasses.node} select-none ${
        isResizing ? 'ring-2 ring-blue-500/50' : ''
      }`}
      style={{
        width: 'auto',
        minWidth: 320,
        transform: `scale(${nodeScale})`,
        transformOrigin: 'top left',
      }}
    >
      <TitleBar data={data} onUpdate={handleUpdate} onDelete={handleDelete} />

      {/* Row-based layout */}
      <div className="flex flex-col">
        {layoutRows.map((row, rowIndex) => {
          const isSingleSectionRow = row.length === 1;
          // Show top drop zone above side-by-side rows when dragging SYSTEM
          const showTopDropZone = draggedSection === 'system' && !isSingleSectionRow;

          return (
            <div key={rowIndex}>
              {/* Top drop zone for SYSTEM above side-by-side rows */}
              {showTopDropZone && (
                <RowDropZone position="top" onDrop={handleDropToTop} />
              )}

              <div className={`flex ${!isSingleSectionRow ? 'gap-3' : ''}`}>
              {row.map((sectionId, colIndex) => {
                if (!sectionId) return null;

                const anchorSide = getAnchorSide(sectionId, rowIndex, colIndex, isSingleSectionRow);
                const canToggleAnchor = isSingleSectionRow && sectionId !== 'system';
                // Side drop zones only when:
                // 1. Dragging an IO section (not system)
                // 2. Target is not the dragged section
                // 3. NOT already side-by-side (if same row, just swap - no zones needed)
                const showSideDropZones = draggedSection !== null &&
                  draggedSection !== sectionId &&
                  draggedSection !== 'system' &&
                  !areInSameRow(draggedSection, sectionId);

                return (
                  <div
                    key={sectionId}
                    className={isSingleSectionRow ? 'w-full' : 'flex-1'}
                  >
                    <DraggableSection
                      sectionId={sectionId}
                      anchorSide={anchorSide}
                      onDragStart={handleSectionDragStart}
                      onDragOver={handleSectionDragOver}
                      onDragEnd={handleSectionDragEnd}
                      onDrop={handleSectionDrop}
                      onDropToSide={handleDropToSide}
                      isDragging={draggedSection === sectionId}
                      isDraggedOver={dragOverSection === sectionId}
                      showSideDropZones={showSideDropZones}
                      isSingleSectionRow={isSingleSectionRow}
                    >
                      {renderSectionContent(sectionId, anchorSide, canToggleAnchor)}
                    </DraggableSection>
                  </div>
                );
              })}
              </div>
            </div>
          );
        })}

        {/* Bottom drop zone - only visible when dragging */}
        {draggedSection && (
          <BottomDropZone onDrop={handleDropToBottom} />
        )}
      </div>

      {/* Resize handle */}
      <ResizeHandle onResizeStart={handleResizeStart} />

      {/* Scale indicator */}
      {nodeScale !== 1 && (
        <div
          className="absolute -bottom-5 left-0 text-[9px] font-mono text-zinc-500"
          style={{ transform: `scale(${1 / nodeScale})`, transformOrigin: 'top left' }}
        >
          {Math.round(nodeScale * 100)}%
        </div>
      )}
    </div>
  );
}

export default memo(SuperNode);
