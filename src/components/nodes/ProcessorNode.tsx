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
    const overrides = permanentSources
      .filter(s => s.category === 'source')
      .map(s => s.name);

    const destinationOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'destination').map(s => s.name)
    );

    const dynamic = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        if (destinationOverrideNames.has(n.label)) return false;
        const isPureSource =
          (n.hasOutputs && !n.hasInputs && !n.hasRows) ||
          (n.hasOutputConnectors && !n.hasInputConnectors) ||
          (n.hasOutputCards && !n.hasInputCards);
        return isPureSource;
      })
      .map(n => n.label);

    const all = [...overrides, ...dynamic];
    return all.filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [nodeSummaries, id, permanentSources]);

  // Get destination names - category overrides + pure destination nodes (input-only)
  const destinationNames = useMemo(() => {
    const overrides = permanentSources
      .filter(s => s.category === 'destination')
      .map(s => s.name);

    const sourceOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'source').map(s => s.name)
    );

    const dynamic = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        if (sourceOverrideNames.has(n.label)) return false;
        const isPureDestination =
          (n.hasInputs && !n.hasOutputs && !n.hasRows) ||
          (n.hasInputConnectors && !n.hasOutputConnectors) ||
          (n.hasInputCards && !n.hasOutputCards) ||
          n.type === 'ledWall';
        return isPureDestination;
      })
      .map(n => n.label);

    const all = [...overrides, ...dynamic];
    return all.filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [nodeSummaries, id, permanentSources]);

  const nodeColor = data.color || '#9b59b6';

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

  // Safety defaults for arrays
  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  const updateInput = useCallback(
    (portId: string, field: keyof ProcessorPort, value: string) => {
      const newInputs = inputs.map((port) =>
        port.id === portId ? { ...port, [field]: value } : port
      );
      updateNodeData(id, { inputs: newInputs });
    },
    [id, inputs, updateNodeData]
  );

  const updateOutput = useCallback(
    (portId: string, field: keyof ProcessorPort, value: string) => {
      const newOutputs = outputs.map((port) =>
        port.id === portId ? { ...port, [field]: value } : port
      );
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, outputs, updateNodeData]
  );

  const addInput = useCallback(() => {
    const newPort: ProcessorPort = {
      id: uuidv4(),
      name: `IN ${inputs.length + 1}`,
      connection: 'HDMI 2.0',
      resolution: '1920x1080@60',
    };
    updateNodeData(id, { inputs: [...inputs, newPort] });
  }, [id, inputs, updateNodeData]);

  const addOutput = useCallback(() => {
    const newPort: ProcessorPort = {
      id: uuidv4(),
      name: `OUT ${outputs.length + 1}`,
      connection: 'HDMI 2.0',
      resolution: '1920x1080@60',
      destination: '',
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

  const layout = data.layout || 'stacked';
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
        {/* Node Header */}
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

        {/* Color Picker */}
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

        {/* IP Address Row */}
        <div className="node-ip-row">
          <span className="ip-label">IP:</span>
          <input
            className="ip-input"
            value={data.ipAddress || ''}
            onChange={(e) => updateIpAddress(e.target.value)}
            placeholder="192.168.1.100"
          />
        </div>

        {/* SYSTEMS Header */}
        <div className="systems-header">SYSTEMS</div>

        {/* Input/Output Tables */}
        <div className="processor-content nodrag">
          {/* INPUTS Table */}
          <div className="io-table-section">
            <div className="io-table-header">
              <span>INPUT</span>
              <button className="add-btn" onClick={addInput}>+</button>
            </div>
            <table className="io-table">
              <thead>
                <tr>
                  <th className="col-name">NAME</th>
                  <th className="col-connection">CONNECTION</th>
                  <th className="col-resolution">RESOLUTION</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {inputs.map((port) => (
                  <tr key={port.id} className="port-table-row">
                    <td className="col-name">
                      <div className="cell-with-handle">
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={`input-${port.id}`}
                          className="port-handle left"
                        />
                        <input
                          value={port.name}
                          onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                          className="table-input"
                          placeholder="Source"
                        />
                      </div>
                    </td>
                    <td className="col-connection">
                      <EditableSelect
                        value={port.connection || ''}
                        options={sourceOptions}
                        onChange={(value) => updateInput(port.id, 'connection', value)}
                        placeholder="Select Source"
                        className="table-select"
                      />
                    </td>
                    <td className="col-resolution">
                      <input
                        value={port.resolution}
                        onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
                        className="table-input"
                        placeholder="Resolution"
                      />
                    </td>
                    <td className="col-actions">
                      <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* OUTPUTS Table */}
          <div className="io-table-section">
            <div className="io-table-header">
              <span>OUTPUT</span>
              <button className="add-btn" onClick={addOutput}>+</button>
            </div>
            <table className="io-table">
              <thead>
                <tr>
                  <th className="col-connection">CONNECTION</th>
                  <th className="col-resolution">RESOLUTION</th>
                  <th className="col-destination">DESTINATION</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {outputs.map((port) => (
                  <tr key={port.id} className="port-table-row">
                    <td className="col-connection">
                      <input
                        value={port.connection}
                        onChange={(e) => updateOutput(port.id, 'connection', e.target.value)}
                        className="table-input"
                        placeholder="Connection"
                      />
                    </td>
                    <td className="col-resolution">
                      <input
                        value={port.resolution}
                        onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
                        className="table-input"
                        placeholder="Resolution"
                      />
                    </td>
                    <td className="col-destination">
                      <div className="cell-with-handle">
                        <EditableSelect
                          value={port.destination || ''}
                          options={destinationOptions}
                          onChange={(value) => updateOutput(port.id, 'destination', value)}
                          placeholder="Select Destination"
                          className="table-select"
                        />
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`output-${port.id}`}
                          className="port-handle right"
                        />
                      </div>
                    </td>
                    <td className="col-actions">
                      <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <NodeResizer
        minWidth={300}
        minHeight={150}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff' }}
      />
    </div>
  );
}

export default memo(ProcessorNode);
