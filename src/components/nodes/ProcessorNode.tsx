import { memo, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { ProcessorNodeData, ProcessorPort, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';
import EditableSelect from '../EditableSelect';

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

type ProcessorNodeProps = NodeProps & {
  data: ProcessorNodeData;
};

function ProcessorNode({ id, data, selected, width, height }: ProcessorNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();
  const { sources: permanentSources } = usePermanentSources();

  // Get source names - category overrides + pure source nodes (output-only)
  const sourceNames = useMemo(() => {
    // Start with category overrides marked as 'source'
    const overrides = permanentSources
      .filter(s => s.category === 'source')
      .map(s => s.name);

    // Add dynamic sources from nodes (excluding those with destination override)
    const destinationOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'destination').map(s => s.name)
    );

    const dynamic = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        // Skip if has destination override
        if (destinationOverrideNames.has(n.label)) return false;
        // Pure sources: nodes that output signals but don't receive them
        const isPureSource =
          // GenericIO with outputs only
          (n.hasOutputs && !n.hasInputs && !n.hasRows) ||
          // Card configured as output type
          (n.hasOutputConnectors && !n.hasInputConnectors) ||
          // BarcoE3 with only output cards
          (n.hasOutputCards && !n.hasInputCards);
        return isPureSource;
      })
      .map(n => n.label);

    // Merge and deduplicate
    const all = [...overrides, ...dynamic];
    return all.filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [nodeSummaries, id, permanentSources]);

  // Get destination names - category overrides + pure destination nodes (input-only)
  const destinationNames = useMemo(() => {
    // Start with category overrides marked as 'destination'
    const overrides = permanentSources
      .filter(s => s.category === 'destination')
      .map(s => s.name);

    // Skip nodes with source override
    const sourceOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'source').map(s => s.name)
    );

    const dynamic = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        // Skip if has source override
        if (sourceOverrideNames.has(n.label)) return false;
        // Pure destinations: nodes that receive signals but don't output them
        const isPureDestination =
          // GenericIO with inputs only
          (n.hasInputs && !n.hasOutputs && !n.hasRows) ||
          // Card configured as input type
          (n.hasInputConnectors && !n.hasOutputConnectors) ||
          // BarcoE3 with only input cards
          (n.hasInputCards && !n.hasOutputCards) ||
          // LEDWall is always a destination
          n.type === 'ledWall';
        return isPureDestination;
      })
      .map(n => n.label);

    // Merge and deduplicate
    const all = [...overrides, ...dynamic];
    return all.filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [nodeSummaries, id, permanentSources]);

  const nodeColor = data.color || '#9b59b6';

  // Handle drag start for category override drop zone
  const handleCategoryDragStart = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/reactflow-node', JSON.stringify({
      label: data.label,
      color: nodeColor,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [data.label, nodeColor]);

  const sourceOptions = useMemo(() => sourceNames.map(name => ({ label: name })), [sourceNames]);
  const destinationOptions = useMemo(() => destinationNames.map(name => ({ label: name })), [destinationNames]);

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

  const updateColor = useCallback(
    (color: string) => {
      updateNodeData(id, { color });
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
      <div ref={contentRef} style={scaleStyle}>
      <div className="node-header" style={{ backgroundColor: data.color || '#0088cc' }}>
        <EditableTitle value={data.label} placeholder="Processor Name" onChange={updateLabel} className="node-title light" />
        <PresetMenu
          nodeType="processor"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
        />
        <button
          className="layout-toggle-btn"
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
            className={`color-btn ${(data.color || '#0088cc') === color ? 'active' : ''}`}
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

      <div className="node-ip-row">
        <span className="ip-label">IP:</span>
        <input
          className="ip-input"
          value={data.ipAddress || ''}
          onChange={(e) => updateIpAddress(e.target.value)}
          placeholder="192.168.1.100"
        />
      </div>

      <div className="processor-content nodrag">
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
                      <EditableSelect
                        value={port.connection || ''}
                        options={sourceOptions}
                        onChange={(value) => updateInput(port.id, 'connection', value)}
                        placeholder="Select Source"
                        className="port-field connection"
                      />
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
                    <EditableSelect
                      value={port.connection || ''}
                      options={sourceOptions}
                      onChange={(value) => updateInput(port.id, 'connection', value)}
                      placeholder="Select Source"
                      className="port-field connection"
                    />
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
                      <EditableSelect
                        value={port.destination || ''}
                        options={destinationOptions}
                        onChange={(value) => updateOutput(port.id, 'destination', value)}
                        placeholder="Select Destination"
                        className="port-field destination"
                      />
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
                    <EditableSelect
                      value={port.destination || ''}
                      options={destinationOptions}
                      onChange={(value) => updateOutput(port.id, 'destination', value)}
                      placeholder="Select Destination"
                      className="port-field destination"
                    />
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
      <NodeResizer
        minWidth={300}
        minHeight={150}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(ProcessorNode);
