import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, NodeResizer, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GenericIONodeData, Port, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';

type GenericIONodeProps = NodeProps & {
  data: GenericIONodeData;
  measured?: { width: number; height: number };
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

function GenericIONode({ id, data, selected, measured }: GenericIONodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

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
      type: 'Other',
    };
    updateNodeData(id, { inputs: [...data.inputs, newPort] });
  }, [id, data.inputs, updateNodeData]);

  const addOutput = useCallback(() => {
    const newPort: Port = {
      id: uuidv4(),
      name: `Output ${data.outputs.length + 1}`,
      type: 'Other',
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

  return (
    <div
      className={`node-generic-io ${selected ? 'selected' : ''} ${layout === 'sideBySide' ? 'side-by-side' : ''}`}
      style={{
        borderColor: nodeColor,
        width: measured?.width,
        height: measured?.height,
      }}
    >
      <NodeResizer
        minWidth={160}
        minHeight={100}
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div className="node-header" style={{ backgroundColor: nodeColor }}>
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Device Name"
        />
        <PresetMenu
          nodeType="genericIO"
          currentData={data}
          onLoadPreset={handleLoadPreset}
        />
        <button
          className="layout-toggle-btn nodrag"
          onClick={toggleLayout}
          title={layout === 'stacked' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
        >
          {layout === 'stacked' ? '⇄' : '⇅'}
        </button>
      </div>

      <div className="color-picker-row">
        {NODE_COLORS.map((color) => (
          <button
            key={color}
            className={`color-btn ${nodeColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => updateColor(color)}
          />
        ))}
      </div>

      <div className="generic-io-content">
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
  );
}

export default memo(GenericIONode);
