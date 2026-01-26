import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ProcessorNodeData, ProcessorPort } from '../../types';
import { v4 as uuidv4 } from 'uuid';

type SwitcherNodeProps = NodeProps & {
  data: ProcessorNodeData;
};

function SwitcherNode({ id, data, selected }: SwitcherNodeProps) {
  const { updateNodeData } = useReactFlow();

  const updateInput = useCallback(
    (portId: string, field: keyof ProcessorPort, value: string) => {
      const newInputs = data.inputs.map((port) =>
        port.id === portId ? { ...port, [field]: value } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, data.inputs, updateNodeData]
  );

  const updateOutput = useCallback(
    (portId: string, field: keyof ProcessorPort, value: string) => {
      const newOutputs = data.outputs.map((port) =>
        port.id === portId ? { ...port, [field]: value } : port
      );
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, data.outputs, updateNodeData]
  );

  const addInput = useCallback(() => {
    const newPort: ProcessorPort = {
      id: uuidv4(),
      name: `IN ${data.inputs.length + 1}`,
      connection: 'HDMI',
      resolution: '1920x1080@60',
    };
    updateNodeData(id, { inputs: [...data.inputs, newPort] });
  }, [id, data.inputs, updateNodeData]);

  const addOutput = useCallback(() => {
    const newPort: ProcessorPort = {
      id: uuidv4(),
      name: `OUT ${data.outputs.length + 1}`,
      connection: 'HDMI',
      resolution: '1920x1080@60',
      destination: '',
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

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  // Calculate handle positions
  const inputHandleOffset = 45;
  const outputHandleOffset = 45;
  const rowHeight = 24;

  return (
    <div
      className={`node-switcher ${selected ? 'selected' : ''}`}
      style={{ borderColor: data.color || '#4a148c' }}
    >
      <div className="node-header" style={{ backgroundColor: data.color || '#4a148c' }}>
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Switcher Name"
        />
      </div>

      <div className="switcher-content">
        {/* Inputs Column */}
        <div className="switcher-column inputs">
          <div className="column-header">
            <span>INPUTS</span>
            <button className="add-btn" onClick={addInput}>+</button>
          </div>
          {data.inputs.map((port, index) => (
            <div key={port.id} className="switcher-port">
              <Handle
                type="target"
                position={Position.Left}
                id={`input-${port.id}`}
                style={{ top: inputHandleOffset + index * rowHeight }}
              />
              <input
                value={port.name}
                onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                className="port-input name"
                placeholder="Name"
              />
              <input
                value={port.connection}
                onChange={(e) => updateInput(port.id, 'connection', e.target.value)}
                className="port-input connection"
                placeholder="Type"
              />
              <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
            </div>
          ))}
        </div>

        {/* Outputs Column */}
        <div className="switcher-column outputs">
          <div className="column-header">
            <span>OUTPUTS</span>
            <button className="add-btn" onClick={addOutput}>+</button>
          </div>
          {data.outputs.map((port, index) => (
            <div key={port.id} className="switcher-port output">
              <input
                value={port.name}
                onChange={(e) => updateOutput(port.id, 'name', e.target.value)}
                className="port-input name"
                placeholder="Name"
              />
              <input
                value={port.connection}
                onChange={(e) => updateOutput(port.id, 'connection', e.target.value)}
                className="port-input connection"
                placeholder="Type"
              />
              <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>
              <Handle
                type="source"
                position={Position.Right}
                id={`output-${port.id}`}
                style={{ top: outputHandleOffset + index * rowHeight }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(SwitcherNode);
