import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ProcessorNodeData, ProcessorPort } from '../../types';
import { v4 as uuidv4 } from 'uuid';

type ProcessorNodeProps = NodeProps & {
  data: ProcessorNodeData;
  measured?: { width: number; height: number };
};

function ProcessorNode({ id, data, selected, measured }: ProcessorNodeProps) {
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
      connection: 'HDMI 2.0',
      resolution: '1920x1080@60',
    };
    updateNodeData(id, { inputs: [...data.inputs, newPort] });
  }, [id, data.inputs, updateNodeData]);

  const addOutput = useCallback(() => {
    const newPort: ProcessorPort = {
      id: uuidv4(),
      name: `OUT ${data.outputs.length + 1}`,
      connection: 'HDMI 2.0',
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

  return (
    <div
      className={`node-processor ${selected ? 'selected' : ''}`}
      style={{
        borderColor: data.color || '#0088cc',
        width: measured?.width,
        height: measured?.height,
      }}
    >
      <NodeResizer
        minWidth={300}
        minHeight={150}
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div className="node-header" style={{ backgroundColor: data.color || '#0088cc' }}>
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Processor Name"
        />
      </div>

      <div className="processor-content">
        <div className="processor-section">
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
                  onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                  className="port-field name"
                  placeholder="Source"
                />
                <input
                  value={port.connection}
                  onChange={(e) => updateInput(port.id, 'connection', e.target.value)}
                  className="port-field connection"
                  placeholder="Connection"
                />
                <input
                  value={port.resolution}
                  onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
                  className="port-field resolution"
                  placeholder="Resolution"
                />
                <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="processor-section">
          <div className="section-header">
            <span>OUTPUTS</span>
            <button className="add-btn" onClick={addOutput}>+</button>
          </div>
          <div className="port-list">
            {data.outputs.map((port) => (
              <div key={port.id} className="port-row">
                <input
                  value={port.connection}
                  onChange={(e) => updateOutput(port.id, 'connection', e.target.value)}
                  className="port-field connection"
                  placeholder="Connection"
                />
                <input
                  value={port.resolution}
                  onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
                  className="port-field resolution"
                  placeholder="Resolution"
                />
                <input
                  value={port.destination || ''}
                  onChange={(e) => updateOutput(port.id, 'destination', e.target.value)}
                  className="port-field destination"
                  placeholder="Destination"
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

export default memo(ProcessorNode);
