import { useCallback, useContext, useState } from 'react';
import { Handle, Position, useReactFlow, NodeResizer, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GenericIONodeData, Port, NodeData, ConnectionType } from '../../types';
import { CONNECTOR_GROUPS } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import { useNodeScale } from '../../hooks/useNodeScale';
import { CascadeLockContext } from '../../App';
import EditableTitle from '../EditableTitle';

type GenericIONodeProps = NodeProps & {
  data: GenericIONodeData;
};

const NODE_COLORS = [
  '#ff0000', // Red
  '#00ff00', // Green
  '#0088cc', // Blue
  '#ff6600', // Orange
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ffff00', // Yellow
  '#8800ff', // Purple
];

// Layout measurements for handle positioning (must match CSS)
const HEADER_HEIGHT = 32;
const COLOR_PICKER_HEIGHT = 28;
const SYSTEMS_HEADER_HEIGHT = 24;
const CONTENT_PADDING = 8;
const SECTION_HEADER_HEIGHT = 26;
const TABLE_HEADER_HEIGHT = 24;
const ROW_HEIGHT = 32;

function GenericIONode({ id, data, selected, width, height }: GenericIONodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // Track which port is temporarily showing dropdown (for switching from Custom to preset)
  const [showDropdownForPort, setShowDropdownForPort] = useState<string | null>(null);

  // Safety defaults for arrays
  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  const updateColor = useCallback(
    (color: string) => {
      updateNodeData(id, { color });
    },
    [id, updateNodeData]
  );

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      const genericData = presetData as GenericIONodeData;
      updateNodeData(id, {
        label: genericData.label,
        color: genericData.color,
        inputs: genericData.inputs || [],
        outputs: genericData.outputs || []
      });
    },
    [id, updateNodeData]
  );

  const toggleLayout = useCallback(() => {
    const newLayout = data.layout === 'sideBySide' ? 'stacked' : 'sideBySide';
    updateNodeData(id, { layout: newLayout });
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, data.layout, updateNodeData, updateNodeInternals]);

  const updateInputType = useCallback(
    (portId: string, type: ConnectionType) => {
      const newInputs = inputs.map((port) =>
        port.id === portId ? { ...port, type, customType: type === 'Custom' ? port.customType : undefined } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, inputs, updateNodeData]
  );

  const updateInputCustomType = useCallback(
    (portId: string, customType: string) => {
      const newInputs = inputs.map((port) =>
        port.id === portId ? { ...port, customType } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, inputs, updateNodeData]
  );

  const toggleInputHandleSide = useCallback(
    (portId: string) => {
      const newInputs = inputs.map((port) =>
        port.id === portId
          ? { ...port, handleSide: port.handleSide === 'right' ? 'left' : 'right' as 'left' | 'right' }
          : port
      );
      updateNodeData(id, { inputs: newInputs });
      setTimeout(() => updateNodeInternals(id), 0);
    },
    [id, inputs, updateNodeData, updateNodeInternals]
  );

  const toggleOutputHandleSide = useCallback(
    (portId: string) => {
      const newOutputs = outputs.map((port) =>
        port.id === portId
          ? { ...port, handleSide: port.handleSide === 'left' ? 'right' : 'left' as 'left' | 'right' }
          : port
      );
      updateNodeData(id, { outputs: newOutputs });
      setTimeout(() => updateNodeInternals(id), 0);
    },
    [id, outputs, updateNodeData, updateNodeInternals]
  );

  const updateOutputType = useCallback(
    (portId: string, type: ConnectionType) => {
      const newOutputs = outputs.map((port) =>
        port.id === portId ? { ...port, type, customType: type === 'Custom' ? port.customType : undefined } : port
      );
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, outputs, updateNodeData]
  );

  const updateOutputCustomType = useCallback(
    (portId: string, customType: string) => {
      const newOutputs = outputs.map((port) =>
        port.id === portId ? { ...port, customType } : port
      );
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, outputs, updateNodeData]
  );

  const addInput = useCallback(() => {
    const newPort: Port = {
      id: uuidv4(),
      name: `Input ${inputs.length + 1}`,
      type: 'HDMI',
    };
    updateNodeData(id, { inputs: [...inputs, newPort] });
  }, [id, inputs, updateNodeData]);

  const addOutput = useCallback(() => {
    const newPort: Port = {
      id: uuidv4(),
      name: `Output ${outputs.length + 1}`,
      type: 'HDMI',
    };
    updateNodeData(id, { outputs: [...outputs, newPort] });
  }, [id, outputs, updateNodeData]);

  const removeInput = useCallback(
    (portId: string) => {
      updateNodeData(id, { inputs: inputs.filter((p) => p.id !== portId) });
    },
    [id, inputs, updateNodeData]
  );

  const removeOutput = useCallback(
    (portId: string) => {
      updateNodeData(id, { outputs: outputs.filter((p) => p.id !== portId) });
    },
    [id, outputs, updateNodeData]
  );

  const nodeColor = data.color || '#0088cc';
  const layout = data.layout || 'sideBySide';
  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;

  // Use the node scale hook for proper content scaling
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);

  // Cascade lock functionality
  const cascadeLockContext = useContext(CascadeLockContext);
  const cascadeInfo = cascadeLockContext?.getCascadeGroup(id);
  const showLockToggle = cascadeInfo && cascadeInfo.isFirstInGroup && cascadeInfo.groupNodes.length >= 2;
  const isLocked = cascadeInfo?.isLocked || false;

  // Calculate scale factor from scaleStyle for handle positioning
  const scaleMatch = scaleStyle.transform?.toString().match(/scale\(([\d.]+)\)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

  // Calculate Y position for handles
  const getHandleY = (isInput: boolean, rowIndex: number) => {
    const baseOffset = HEADER_HEIGHT + COLOR_PICKER_HEIGHT + SYSTEMS_HEADER_HEIGHT + CONTENT_PADDING;
    const sectionStart = baseOffset + SECTION_HEADER_HEIGHT + TABLE_HEADER_HEIGHT;
    const isSideBySide = layout === 'sideBySide';

    if (isSideBySide) {
      return (sectionStart + (rowIndex * ROW_HEIGHT) + ROW_HEIGHT / 2) * scale;
    } else {
      if (isInput) {
        return (sectionStart + (rowIndex * ROW_HEIGHT) + ROW_HEIGHT / 2) * scale;
      } else {
        const inputSectionHeight = SECTION_HEADER_HEIGHT + TABLE_HEADER_HEIGHT + (inputs.length * ROW_HEIGHT);
        return (sectionStart + inputSectionHeight + (rowIndex * ROW_HEIGHT) + ROW_HEIGHT / 2) * scale;
      }
    }
  };

  // Render a port table section (inputs or outputs)
  const renderPortTable = (
    ports: Port[],
    isInput: boolean,
    sectionTitle: string,
    onAdd: () => void,
    onRemove: (portId: string) => void,
    onTypeChange: (portId: string, type: ConnectionType) => void,
    onCustomTypeChange: (portId: string, customType: string) => void,
    onToggleHandleSide: (portId: string) => void
  ) => (
    <div className="io-table-section">
      <div className="io-table-header">
        <span>{sectionTitle}</span>
        <button className="add-btn" onClick={onAdd}>+</button>
      </div>
      <table className="io-table">
        <thead>
          <tr>
            <th className="col-source">SOURCE</th>
            <th className="col-name">NAME</th>
            <th className="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          {ports.map((port) => {
            const handleOnOpposite = isInput
              ? port.handleSide === 'right'
              : port.handleSide === 'left';

            return (
              <tr key={port.id} className={`port-table-row ${handleOnOpposite ? 'handle-opposite' : ''}`}>
                <td className="col-source">
                  {port.type === 'Custom' ? (
                    <div className="custom-type-wrapper">
                      <div className="custom-type-row">
                        <input
                          value={port.customType || ''}
                          onChange={(e) => onCustomTypeChange(port.id, e.target.value)}
                          className="port-field custom-type"
                          placeholder="Type"
                        />
                        <button
                          className="preset-btn"
                          onClick={() => {
                            const key = isInput ? port.id : `out-${port.id}`;
                            setShowDropdownForPort(showDropdownForPort === key ? null : key);
                          }}
                          title="Switch to preset"
                        >
                          ▼
                        </button>
                      </div>
                      {showDropdownForPort === (isInput ? port.id : `out-${port.id}`) && (
                        <select
                          value=""
                          onChange={(e) => {
                            onTypeChange(port.id, e.target.value as ConnectionType);
                            setShowDropdownForPort(null);
                          }}
                          onBlur={() => setTimeout(() => setShowDropdownForPort(null), 150)}
                          className="port-field type-select dropdown-below"
                          autoFocus
                          size={7}
                        >
                          {Object.entries(CONNECTOR_GROUPS).map(([_groupName, types]) => (
                            types.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <select
                      value={port.type}
                      onChange={(e) => onTypeChange(port.id, e.target.value as ConnectionType)}
                      className="port-field type-select"
                    >
                      {Object.entries(CONNECTOR_GROUPS).map(([groupName, types]) => (
                        <optgroup key={groupName} label={groupName}>
                          {types.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </td>
                <td className="col-name">
                  <span className="name-text">{port.name}</span>
                </td>
                <td className="col-actions">
                  <div className="action-buttons">
                    <button
                      className="handle-switch-btn"
                      onClick={() => onToggleHandleSide(port.id)}
                      title={handleOnOpposite ? 'Move handle to default side' : 'Move handle to opposite side'}
                    >
                      {isInput ? (handleOnOpposite ? '←' : '→') : (handleOnOpposite ? '→' : '←')}
                    </button>
                    <button className="remove-btn" onClick={() => onRemove(port.id)}>×</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div
      className={`node-generic-io ${selected ? 'selected' : ''} ${layout === 'sideBySide' ? 'side-by-side' : ''}`}
      style={{
        borderColor: nodeColor,
        width: nodeWidth,
        height: nodeHeight,
      }}
    >
      {showLockToggle && (
        <button
          className={`cascade-lock-toggle nodrag ${isLocked ? 'locked' : ''}`}
          onClick={() => cascadeLockContext?.toggleCascadeLock(id)}
          title={isLocked ? `Unlock cascade (${cascadeInfo.groupNodes.length} nodes)` : `Lock cascade (${cascadeInfo.groupNodes.length} nodes)`}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>
      )}

      {/* Handles rendered OUTSIDE the scaled content so they position at node edge */}
      {inputs.map((port, index) => {
        const isOnRight = port.handleSide === 'right';
        return (
          <Handle
            key={`input-${port.id}`}
            type="target"
            position={isOnRight ? Position.Right : Position.Left}
            id={`input-${port.id}`}
            className="port-handle"
            style={{ top: getHandleY(true, index) }}
          />
        );
      })}
      {outputs.map((port, index) => {
        const isOnLeft = port.handleSide === 'left';
        return (
          <Handle
            key={`output-${port.id}`}
            type="source"
            position={isOnLeft ? Position.Left : Position.Right}
            id={`output-${port.id}`}
            className="port-handle"
            style={{ top: getHandleY(false, index) }}
          />
        );
      })}

      <div ref={contentRef} style={scaleStyle} className="node-scale-content">
        {/* Node Header */}
        <div className="node-header" style={{ backgroundColor: nodeColor }}>
          <EditableTitle value={data.label} placeholder="Device Name" onChange={updateLabel} className="node-title light" />
          <PresetMenu
            nodeType="genericIO"
            currentData={data}
            currentLabel={data.label}
            onLoadPreset={handleLoadPreset}
            onRename={updateLabel}
          />
          <button
            className="layout-toggle-btn nodrag"
            onClick={toggleLayout}
            title={layout === 'stacked' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
          >
            {layout === 'stacked' ? '⇄' : '⇅'}
          </button>
        </div>

        {/* Color Picker */}
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

        {/* SYSTEMS Header */}
        <div className="systems-header">SYSTEMS</div>

        {/* Input/Output Tables */}
        <div className="generic-io-content nodrag">
          {renderPortTable(
            inputs,
            true,
            'INPUT',
            addInput,
            removeInput,
            updateInputType,
            updateInputCustomType,
            toggleInputHandleSide
          )}
          {renderPortTable(
            outputs,
            false,
            'OUTPUT',
            addOutput,
            removeOutput,
            updateOutputType,
            updateOutputCustomType,
            toggleOutputHandleSide
          )}
        </div>
      </div>
      <NodeResizer
        minWidth={160}
        minHeight={100}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff' }}
      />
    </div>
  );
}

// Note: memo() removed because context changes need to trigger re-renders for cascade lock
export default GenericIONode;
