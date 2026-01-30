import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { ProcessorNodeData, ProcessorPort, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';

type ProcessorNodeProps = NodeProps & {
  data: ProcessorNodeData;
};

function ProcessorNode({ id, data, selected, width, height }: ProcessorNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();

  const sourceNames = useMemo(() => {
    return nodeSummaries
      .filter(n => n.id !== id && n.hasOutputs && n.label)
      .map(n => n.label)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [nodeSummaries, id]);

  const destinationNames = useMemo(() => {
    return nodeSummaries
      .filter(n => n.id !== id && n.hasInputs && n.label)
      .map(n => n.label)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [nodeSummaries, id]);

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

  const updateIpAddress = useCallback(
    (value: string) => {
      updateNodeData(id, { ipAddress: value });
    },
    [id, updateNodeData]
  );

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      updateNodeData(id, presetData as Partial<ProcessorNodeData>);
    },
    [id, updateNodeData]
  );

  const toggleLayout = useCallback(() => {
    const newLayout = data.layout === 'sideBySide' ? 'stacked' : 'sideBySide';
    updateNodeData(id, { layout: newLayout });
  }, [id, data.layout, updateNodeData]);

  const toggleInputField = useCallback((field: 'name' | 'connection' | 'resolution') => {
    const currentFields = data.visibleInputFields || ['name'];
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field];
    updateNodeData(id, { visibleInputFields: newFields.length > 0 ? newFields : ['name'] });
  }, [id, data.visibleInputFields, updateNodeData]);

  const toggleOutputField = useCallback((field: 'connection' | 'resolution' | 'destination') => {
    const currentFields = data.visibleOutputFields || ['destination'];
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field];
    updateNodeData(id, { visibleOutputFields: newFields.length > 0 ? newFields : ['destination'] });
  }, [id, data.visibleOutputFields, updateNodeData]);

  const layout = data.layout || 'stacked';
  const visibleInputFields = data.visibleInputFields || ['name'];
  const visibleOutputFields = data.visibleOutputFields || ['destination'];
  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);

  return (
    <div
      className={`node-processor ${selected ? 'selected' : ''} ${layout === 'sideBySide' ? 'side-by-side' : ''}`}
      style={{
        borderColor: data.color || '#0088cc',
        width: nodeWidth,
        height: nodeHeight,
      }}
    >
      <NodeResizer
        minWidth={300}
        minHeight={150}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div ref={contentRef} style={scaleStyle}>
      <div className="node-header" style={{ backgroundColor: data.color || '#0088cc' }}>
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Processor Name"
        />
        <PresetMenu
          nodeType="processor"
          currentData={data}
          onLoadPreset={handleLoadPreset}
        />
        <button
          className="layout-toggle-btn"
          onClick={toggleLayout}
          title={layout === 'stacked' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
        >
          {layout === 'stacked' ? '⇄' : '⇅'}
        </button>
      </div>
      <div className="node-ip-row">
        <span className="ip-label">IP:</span>
        <input
          className="ip-input"
          value={data.ipAddress || ''}
          onChange={(e) => updateIpAddress(e.target.value)}
          placeholder="192.168.1.100"
        />
      </div>

      <div className="processor-content">
        <div className="processor-section">
          <div className="section-header">
            <span>INPUTS</span>
            <div className="field-toggles">
              {layout === 'sideBySide' && (
                <>
                  <button
                    className={`field-toggle-btn ${visibleInputFields.includes('name') ? 'active' : ''}`}
                    onClick={() => toggleInputField('name')}
                    title="Toggle Name field"
                  >
                    N
                  </button>
                  <button
                    className={`field-toggle-btn ${visibleInputFields.includes('connection') ? 'active' : ''}`}
                    onClick={() => toggleInputField('connection')}
                    title="Toggle Connection field"
                  >
                    C
                  </button>
                  <button
                    className={`field-toggle-btn ${visibleInputFields.includes('resolution') ? 'active' : ''}`}
                    onClick={() => toggleInputField('resolution')}
                    title="Toggle Resolution field"
                  >
                    R
                  </button>
                </>
              )}
              <button className="add-btn" onClick={addInput}>+</button>
            </div>
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
                {layout === 'sideBySide' ? (
                  <>
                    {visibleInputFields.includes('name') && (
                      <input
                        value={port.name}
                        onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                        className="port-field name"
                        placeholder="Source"
                      />
                    )}
                    {visibleInputFields.includes('connection') && (
                      <select
                        value={sourceNames.includes(port.connection) ? port.connection : (port.connection ? port.connection : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            const customName = prompt('Enter custom source name:');
                            if (customName) {
                              updateInput(port.id, 'connection', customName);
                            }
                          } else {
                            updateInput(port.id, 'connection', e.target.value);
                          }
                        }}
                        className="port-field connection"
                      >
                        <option value="">Select Source</option>
                        {/* Show current custom value if it exists */}
                        {port.connection && !sourceNames.includes(port.connection) && (
                          <option value={port.connection}>{port.connection}</option>
                        )}
                        {sourceNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
                    )}
                    {visibleInputFields.includes('resolution') && (
                      <input
                        value={port.resolution}
                        onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
                        className="port-field resolution"
                        placeholder="Resolution"
                      />
                    )}
                    <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
                  </>
                ) : (
                  <>
                    <input
                      value={port.name}
                      onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                      className="port-field name"
                      placeholder="Source"
                    />
                    <select
                      value={sourceNames.includes(port.connection) ? port.connection : (port.connection ? port.connection : '')}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          const customName = prompt('Enter custom source name:');
                          if (customName) {
                            updateInput(port.id, 'connection', customName);
                          }
                        } else {
                          updateInput(port.id, 'connection', e.target.value);
                        }
                      }}
                      className="port-field connection"
                    >
                      <option value="">Select Source</option>
                      {port.connection && !sourceNames.includes(port.connection) && (
                        <option value={port.connection}>{port.connection}</option>
                      )}
                      {sourceNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="__custom__">Custom...</option>
                    </select>
                    <input
                      value={port.resolution}
                      onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
                      className="port-field resolution"
                      placeholder="Resolution"
                    />
                    <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="processor-section">
          <div className="section-header">
            <span>OUTPUTS</span>
            <div className="field-toggles">
              {layout === 'sideBySide' && (
                <>
                  <button
                    className={`field-toggle-btn ${visibleOutputFields.includes('connection') ? 'active' : ''}`}
                    onClick={() => toggleOutputField('connection')}
                    title="Toggle Connection field"
                  >
                    C
                  </button>
                  <button
                    className={`field-toggle-btn ${visibleOutputFields.includes('resolution') ? 'active' : ''}`}
                    onClick={() => toggleOutputField('resolution')}
                    title="Toggle Resolution field"
                  >
                    R
                  </button>
                  <button
                    className={`field-toggle-btn ${visibleOutputFields.includes('destination') ? 'active' : ''}`}
                    onClick={() => toggleOutputField('destination')}
                    title="Toggle Destination field"
                  >
                    D
                  </button>
                </>
              )}
              <button className="add-btn" onClick={addOutput}>+</button>
            </div>
          </div>
          <div className="port-list">
            {data.outputs.map((port) => (
              <div key={port.id} className="port-row">
                {layout === 'sideBySide' ? (
                  <>
                    {visibleOutputFields.includes('connection') && (
                      <input
                        value={port.connection}
                        onChange={(e) => updateOutput(port.id, 'connection', e.target.value)}
                        className="port-field connection"
                        placeholder="Connection"
                      />
                    )}
                    {visibleOutputFields.includes('resolution') && (
                      <input
                        value={port.resolution}
                        onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
                        className="port-field resolution"
                        placeholder="Resolution"
                      />
                    )}
                    {visibleOutputFields.includes('destination') && (
                      <select
                        value={destinationNames.includes(port.destination || '') ? port.destination : (port.destination ? port.destination : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            const customName = prompt('Enter custom destination name:');
                            if (customName) {
                              updateOutput(port.id, 'destination', customName);
                            }
                          } else {
                            updateOutput(port.id, 'destination', e.target.value);
                          }
                        }}
                        className="port-field destination"
                      >
                        <option value="">Select Destination</option>
                        {port.destination && !destinationNames.includes(port.destination) && (
                          <option value={port.destination}>{port.destination}</option>
                        )}
                        {destinationNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
                    )}
                    <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>
                  </>
                ) : (
                  <>
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
                    <select
                      value={destinationNames.includes(port.destination || '') ? port.destination : (port.destination ? port.destination : '')}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          const customName = prompt('Enter custom destination name:');
                          if (customName) {
                            updateOutput(port.id, 'destination', customName);
                          }
                        } else {
                          updateOutput(port.id, 'destination', e.target.value);
                        }
                      }}
                      className="port-field destination"
                    >
                      <option value="">Select Destination</option>
                      {port.destination && !destinationNames.includes(port.destination) && (
                        <option value={port.destination}>{port.destination}</option>
                      )}
                      {destinationNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="__custom__">Custom...</option>
                    </select>
                    <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>
                  </>
                )}
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
    </div>
  );
}

export default memo(ProcessorNode);
