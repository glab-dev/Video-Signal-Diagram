import { memo, useCallback, useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useHandlePositions } from '../../hooks/useHandlePositions';
import type { ProcessorNodeData, ProcessorPort, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import NodeShell from './NodeShell';
import EditableSelect from '../EditableSelect';

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

  const layout = data.layout || 'stacked';

  // DOM-measured handle positioning
  const nodeRef = useRef<HTMLDivElement>(null);
  const { rowRef, positions: handlePositions } = useHandlePositions(
    nodeRef,
    [inputs, outputs, layout, width, height]
  );

  // Build handles outside contentRef
  const handles = (
    <>
      {inputs.map((port) => (
        <Handle
          key={`input-${port.id}`}
          type="target"
          position={Position.Left}
          id={`input-${port.id}`}
          className="port-handle"
          style={{ top: handlePositions[`input-${port.id}`] ?? 0 }}
        />
      ))}
      {outputs.map((port) => (
        <Handle
          key={`output-${port.id}`}
          type="source"
          position={Position.Right}
          id={`output-${port.id}`}
          className="port-handle"
          style={{ top: handlePositions[`output-${port.id}`] ?? 0 }}
        />
      ))}
    </>
  );

  return (
    <NodeShell
      id={id}
      selected={selected}
      width={width}
      height={height}
      nodeType="processor"
      nodeClassName="node-processor"
      defaultColor="#9b59b6"
      data={data}
      minWidth={300}
      minHeight={150}
      placeholder="Processor Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      extraClassName={layout === 'sideBySide' ? 'side-by-side' : ''}
      showIpRow
      ipAddress={data.ipAddress}
      onIpChange={updateIpAddress}
      nodeRef={nodeRef}
      outsideHandles={handles}
      headerButtons={
        <>
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
        </>
      }
    >
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
                <tr key={port.id} ref={rowRef(`input-${port.id}`)} className="port-table-row">
                  <td className="col-name">
                    <input
                      value={port.name}
                      onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                      className="table-input"
                      placeholder="Source"
                    />
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
                <tr key={port.id} ref={rowRef(`output-${port.id}`)} className="port-table-row">
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
                    <EditableSelect
                      value={port.destination || ''}
                      options={destinationOptions}
                      onChange={(value) => updateOutput(port.id, 'destination', value)}
                      placeholder="Select Destination"
                      className="table-select"
                    />
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
    </NodeShell>
  );
}

export default memo(ProcessorNode);
