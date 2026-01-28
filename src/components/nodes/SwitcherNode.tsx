import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ProcessorNodeData, ProcessorPort } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Top 15 video resolutions plus Custom option
const VIDEO_RESOLUTIONS = [
  '3840x2160@60',
  '3840x2160@30',
  '1920x1080@60',
  '1920x1080@30',
  '1920x1080@24',
  '1280x720@60',
  '1280x720@30',
  '4096x2160@60',
  '4096x2160@24',
  '2560x1440@60',
  '7680x4320@60',
  '1920x1200@60',
  '2048x1080@60',
  '1366x768@60',
  '1600x1200@60',
  'Custom',
] as const;

type SwitcherNodeProps = NodeProps & {
  data: ProcessorNodeData;
  measured?: { width: number; height: number };
};

function SwitcherNode({ id, data, selected, measured }: SwitcherNodeProps) {
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

  return (
    <div
      className={`node-switcher ${selected ? 'selected' : ''}`}
      style={{
        borderColor: data.color || '#4a148c',
        width: measured?.width,
        height: measured?.height,
      }}
    >
      <NodeResizer
        minWidth={280}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
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
          <div className="switcher-field-headers">
            <span className="field-header source">SOURCE</span>
            <span className="field-header input-num">INPUT #</span>
            <span className="field-header resolution">RESOLUTION</span>
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
                  value={port.connection}
                  onChange={(e) => updateInput(port.id, 'connection', e.target.value)}
                  className="port-field connection"
                  placeholder="Source"
                />
                <input
                  value={port.name}
                  onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                  className="port-field name"
                  placeholder="Input #"
                />
                {VIDEO_RESOLUTIONS.includes(port.resolution as any) && port.resolution !== 'Custom' ? (
                  <select
                    value={port.resolution || ''}
                    onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
                    className="port-field resolution"
                  >
                    <option value="">Select Resolution</option>
                    {VIDEO_RESOLUTIONS.map((res) => (
                      <option key={res} value={res}>{res}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={port.resolution || ''}
                    onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
                    className="port-field resolution"
                    placeholder="Custom Resolution"
                  />
                )}
                <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs Column */}
        <div className="switcher-column outputs">
          <div className="column-header">
            <span>OUTPUTS</span>
            <button className="add-btn" onClick={addOutput}>+</button>
          </div>
          <div className="switcher-field-headers">
            <span className="field-header source">SOURCE</span>
            <span className="field-header output-num">OUTPUT #</span>
            <span className="field-header resolution">RESOLUTION</span>
          </div>
          <div className="port-list">
            {data.outputs.map((port) => (
              <div key={port.id} className="port-row output">
                <input
                  value={port.destination || ''}
                  onChange={(e) => updateOutput(port.id, 'destination', e.target.value)}
                  className="port-field destination"
                  placeholder="Source"
                />
                <input
                  value={port.name}
                  onChange={(e) => updateOutput(port.id, 'name', e.target.value)}
                  className="port-field name"
                  placeholder="Output #"
                />
                {VIDEO_RESOLUTIONS.includes(port.resolution as any) && port.resolution !== 'Custom' ? (
                  <select
                    value={port.resolution || ''}
                    onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
                    className="port-field resolution"
                  >
                    <option value="">Select Resolution</option>
                    {VIDEO_RESOLUTIONS.map((res) => (
                      <option key={res} value={res}>{res}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={port.resolution || ''}
                    onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
                    className="port-field resolution"
                    placeholder="Custom Resolution"
                  />
                )}
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

export default memo(SwitcherNode);
