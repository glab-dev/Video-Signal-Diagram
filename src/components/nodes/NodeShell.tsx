import { useCallback } from 'react';
import type { ReactNode, Ref } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { CustomNodeType, NodeData } from '../../types';
import { NODE_COLORS } from './nodeConstants';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';

export interface NodeShellProps {
  id: string;
  selected?: boolean;
  width?: number;
  nodeType: CustomNodeType;
  nodeClassName: string;
  defaultColor: string;
  data: { label: string; color?: string; [key: string]: unknown };
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  placeholder: string;
  presetData: NodeData;
  onLoadPreset: (data: NodeData) => void;
  onReset?: () => void;
  headerButtons?: ReactNode;
  showIpRow?: boolean;
  ipAddress?: string;
  onIpChange?: (value: string) => void;
  showSystemsHeader?: boolean;
  extraClassName?: string;
  outsideHandles?: ReactNode;
  outsideContentBefore?: ReactNode;
  nodeRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export default function NodeShell({
  id,
  selected,
  width,
  nodeType,
  nodeClassName,
  defaultColor,
  data,
  minWidth,
  minHeight,
  maxWidth,
  placeholder,
  presetData,
  onLoadPreset,
  onReset,
  headerButtons,
  showIpRow,
  ipAddress,
  onIpChange,
  showSystemsHeader = true,
  extraClassName,
  outsideHandles,
  outsideContentBefore,
  nodeRef,
  children,
}: NodeShellProps) {
  const { updateNodeData, deleteElements } = useReactFlow();

  const nodeColor = data.color || defaultColor;
  const nodeWidth = width || undefined;
  // Don't constrain height — let nodes auto-expand vertically when content changes
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth);

  const updateLabel = useCallback(
    (value: string) => updateNodeData(id, { label: value }),
    [id, updateNodeData]
  );

  const updateColor = useCallback(
    (color: string) => updateNodeData(id, { color }),
    [id, updateNodeData]
  );

  const classNames = [
    'node-shell',
    nodeClassName,
    selected ? 'selected' : '',
    extraClassName || '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={nodeRef}
      className={classNames}
      style={{
        borderColor: nodeColor,
        width: nodeWidth,
      }}
    >
      {outsideContentBefore}
      {outsideHandles}

      <div ref={contentRef} style={scaleStyle} className="node-scale-content">
        {/* Node Header */}
        <div className="node-header" style={{ backgroundColor: nodeColor }}>
          <EditableTitle
            value={data.label}
            placeholder={placeholder}
            onChange={updateLabel}
            className="node-title light"
          />
          <PresetMenu
            nodeType={nodeType}
            currentData={presetData}
            currentLabel={data.label}
            onLoadPreset={onLoadPreset}
            onRename={updateLabel}
            onReset={onReset}
            onDelete={() => deleteElements({ nodes: [{ id }] })}
          />
          {headerButtons}
        </div>

        {/* Color Picker Row */}
        <div className="color-picker-row nodrag" style={{ pointerEvents: 'auto' }}>
          {NODE_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              className={`color-btn ${nodeColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color, pointerEvents: 'auto' }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateColor(color);
              }}
            />
          ))}
        </div>

        {/* Optional IP Address Row */}
        {showIpRow && (
          <div className="node-ip-row">
            <span className="ip-label">IP:</span>
            <input
              className="ip-input"
              value={ipAddress || ''}
              onChange={(e) => onIpChange?.(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>
        )}

        {/* Optional SYSTEMS Header */}
        {showSystemsHeader && (
          <div className="systems-header">SYSTEMS</div>
        )}

        {/* Node-specific content */}
        {children}
      </div>

      <NodeResizer
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff' }}
      />
    </div>
  );
}
