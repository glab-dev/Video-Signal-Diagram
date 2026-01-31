import { useCallback, useContext, useState } from 'react';
import type { DragEvent } from 'react';
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

function GenericIONode({ id, data, selected, width, height }: GenericIONodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // Track which port is temporarily showing dropdown (for switching from Custom to preset)
  const [showDropdownForPort, setShowDropdownForPort] = useState<string | null>(null);

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
        inputs: genericData.inputs,
        outputs: genericData.outputs
      });
    },
    [id, updateNodeData]
  );

  const toggleLayout = useCallback(() => {
    const newLayout = data.layout === 'sideBySide' ? 'stacked' : 'sideBySide';
    updateNodeData(id, { layout: newLayout });
    // Force React Flow to update handle positions after layout change
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, data.layout, updateNodeData, updateNodeInternals]);

  const updateInput = useCallback(
    (portId: string, name: string) => {
      const newInputs = data.inputs.map((port) =>
        port.id === portId ? { ...port, name } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, data.inputs, updateNodeData]
  );

  const updateInputType = useCallback(
    (portId: string, type: ConnectionType) => {
      const newInputs = data.inputs.map((port) =>
        port.id === portId ? { ...port, type, customType: type === 'Custom' ? port.customType : undefined } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, data.inputs, updateNodeData]
  );

  const updateInputCustomType = useCallback(
    (portId: string, customType: string) => {
      const newInputs = data.inputs.map((port) =>
        port.id === portId ? { ...port, customType } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, data.inputs, updateNodeData]
  );

  const updateOutput = useCallback(
    (portId: string, name: string) => {
      const newOutputs = data.outputs.map((port) =>
        port.id === portId ? { ...port, name } : port
      );
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, data.outputs, updateNodeData]
  );

  const addInput = useCallback(() => {
    const newPort: Port = {
      id: uuidv4(),
      name: `Input ${data.inputs.length + 1}`,
      type: 'Custom',
    };
    updateNodeData(id, { inputs: [...data.inputs, newPort] });
  }, [id, data.inputs, updateNodeData]);

  const addOutput = useCallback(() => {
    const newPort: Port = {
      id: uuidv4(),
      name: `Output ${data.outputs.length + 1}`,
      type: 'Custom',
    };
    updateNodeData(id, { outputs: [...data.outputs, newPort] });
  }, [id, data.outputs, updateNodeData]);

  const removeInput = useCallback(
    (portId: string) => {
      updateNodeData(id, { inputs: data.inputs.filter((p) => p.id !== portId) });
    },
    [id, data.inputs, updateNodeData]
  );

  const removeOutput = useCallback(
    (portId: string) => {
      updateNodeData(id, { outputs: data.outputs.filter((p) => p.id !== portId) });
    },
    [id, data.outputs, updateNodeData]
  );

  const nodeColor = data.color || '#0088cc';
  const layout = data.layout || 'sideBySide';
  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);

  // Cascade lock functionality
  const cascadeLockContext = useContext(CascadeLockContext);
  const cascadeInfo = cascadeLockContext?.getCascadeGroup(id);
  const showLockToggle = cascadeInfo && cascadeInfo.isFirstInGroup && cascadeInfo.groupNodes.length >= 2;
  const isLocked = cascadeInfo?.isLocked || false;

  // Handle drag start for category override drop zone
  const handleCategoryDragStart = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/reactflow-node', JSON.stringify({
      label: data.label,
      color: nodeColor,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [data.label, nodeColor]);

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
      <div ref={contentRef} style={scaleStyle}>
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
        <button
          className="category-drag-btn nodrag"
          draggable
          onDragStart={handleCategoryDragStart}
          title="Drag to Category Overrides to set as source/destination"
        >
          ⊕
        </button>
      </div>

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

      <div className="generic-io-content nodrag">
        <div className="io-section">
          <div className="section-header">
            <span>INPUTS</span>
            <button className="add-btn" onClick={addInput}>+</button>
          </div>
          <div className="port-list">
            {data.inputs.map((port) => (
              <div key={port.id} className="port-row">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`input-${port.id}`}
                  className="port-handle left"
                />
                {port.type === 'Custom' && showDropdownForPort !== port.id ? (
                  <>
                    <input
                      value={port.customType || ''}
                      onChange={(e) => updateInputCustomType(port.id, e.target.value)}
                      className="port-field custom-type"
                      placeholder="Connector..."
                    />
                    <button
                      className="preset-btn"
                      onClick={() => setShowDropdownForPort(port.id)}
                      title="Switch to preset"
                    >
                      ▼
                    </button>
                  </>
                ) : (
                  <select
                    value={port.type === 'Custom' ? '' : port.type}
                    onChange={(e) => {
                      updateInputType(port.id, e.target.value as ConnectionType);
                      setShowDropdownForPort(null);
                    }}
                    onBlur={() => setShowDropdownForPort(null)}
                    className="port-field type-select"
                    autoFocus={showDropdownForPort === port.id}
                  >
                    {showDropdownForPort === port.id && (
                      <option value="" disabled>Select connector...</option>
                    )}
                    {Object.entries(CONNECTOR_GROUPS).map(([groupName, types]) => (
                      <optgroup key={groupName} label={groupName}>
                        {types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                <input
                  value={port.name}
                  onChange={(e) => updateInput(port.id, e.target.value)}
                  className="port-field name"
                  placeholder="Input name"
                />
                <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="io-section">
          <div className="section-header">
            <span>OUTPUTS</span>
            <button className="add-btn" onClick={addOutput}>+</button>
          </div>
          <div className="port-list">
            {data.outputs.map((port) => (
              <div key={port.id} className="port-row output">
                <input
                  value={port.name}
                  onChange={(e) => updateOutput(port.id, e.target.value)}
                  className="port-field name"
                  placeholder="Output name"
                />
                <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`output-${port.id}`}
                  className="port-handle right"
                />
              </div>
            ))}
          </div>
        </div>
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
