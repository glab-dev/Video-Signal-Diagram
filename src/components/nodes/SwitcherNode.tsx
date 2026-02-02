import { memo, useCallback, useState, useRef, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useHandlePositions } from '../../hooks/useHandlePositions';
import type { ProcessorNodeData, ProcessorPort, InputFieldType, OutputFieldType, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import NodeShell from './NodeShell';
import EditableSelect from '../EditableSelect';

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

// Column configuration for inputs
const INPUT_FIELD_CONFIG: Record<InputFieldType, { label: string; className: string; flex: number; minWidth: number }> = {
  connection: { label: 'SOURCE', className: 'source connection', flex: 1, minWidth: 80 },
  name: { label: 'INPUT #', className: 'input-num name', flex: 0.8, minWidth: 70 },
  resolution: { label: 'RESOLUTION', className: 'resolution', flex: 1.2, minWidth: 100 }
};

// Column configuration for outputs
const OUTPUT_FIELD_CONFIG: Record<OutputFieldType, { label: string; className: string; flex: number; minWidth: number }> = {
  destination: { label: 'SOURCE', className: 'source destination', flex: 1, minWidth: 80 },
  name: { label: 'OUTPUT #', className: 'output-num name', flex: 0.8, minWidth: 70 },
  resolution: { label: 'RESOLUTION', className: 'resolution', flex: 1.2, minWidth: 100 }
};

type SwitcherNodeProps = NodeProps & {
  data: ProcessorNodeData;
};

function SwitcherNode({ id, data, selected, width, height }: SwitcherNodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeSummaries = useNodeSummariesContext();
  const { sources: permanentSources } = usePermanentSources();

  // Get sources with colors
  const sourcesWithColors = useMemo(() => {
    const overrides = permanentSources
      .filter(s => s.category === 'source')
      .map(s => ({ label: s.name, color: s.color }));

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
      .map(n => ({ label: n.label, color: n.color }));

    const all = [...overrides, ...dynamic];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

  const nodeColor = data.color || '#0088cc';

  const handleCategoryDragStart = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/reactflow-node', JSON.stringify({
      label: data.label,
      color: nodeColor,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [data.label, nodeColor]);

  // Lock at 20x20 or 40x40 for Blackmagic switchers
  const isLocked = (data.inputs.length === 20 && data.outputs.length === 20) ||
                   (data.inputs.length === 40 && data.outputs.length === 40);

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

  const setAllInputResolutions = useCallback(
    (resolution: string) => {
      const newInputs = data.inputs.map((port) => ({ ...port, resolution }));
      updateNodeData(id, { inputs: newInputs });
    },
    [id, data.inputs, updateNodeData]
  );

  const setAllOutputResolutions = useCallback(
    (resolution: string) => {
      const newOutputs = data.outputs.map((port) => ({ ...port, resolution }));
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, data.outputs, updateNodeData]
  );

  const toggleLayout = useCallback(() => {
    const newLayout = data.layout === 'sideBySide' ? 'stacked' : 'sideBySide';
    updateNodeData(id, { layout: newLayout });
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, data.layout, updateNodeData, updateNodeInternals]);

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

  const handleReset = useCallback(() => {
    const resetInputs = data.inputs.map((port) => ({ ...port, spacing: 0 }));
    const resetOutputs = data.outputs.map((port) => ({ ...port, spacing: 0 }));
    updateNodeData(id, {
      inputColumnOrder: ['connection', 'name', 'resolution'],
      outputColumnOrder: ['destination', 'name', 'resolution'],
      inputs: resetInputs,
      outputs: resetOutputs
    });
  }, [id, data.inputs, data.outputs, updateNodeData]);

  // Column ordering
  const inputColumnOrder = data.inputColumnOrder || ['connection', 'name', 'resolution'];
  const outputColumnOrder = data.outputColumnOrder || ['destination', 'name', 'resolution'];

  const [draggedColumn, setDraggedColumn] = useState<{type: 'input' | 'output', index: number} | null>(null);

  // Vertical Space Tab feature
  const [_draggedPort, setDraggedPort] = useState<string | null>(null);
  const dragStartY = useRef<number>(0);
  const dragStartSpacing = useRef<number>(0);

  const reorderInputColumns = useCallback((dragIndex: number, dropIndex: number) => {
    const newOrder = [...inputColumnOrder];
    const [draggedItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    updateNodeData(id, { inputColumnOrder: newOrder });
  }, [inputColumnOrder, id, updateNodeData]);

  const reorderOutputColumns = useCallback((dragIndex: number, dropIndex: number) => {
    const newOrder = [...outputColumnOrder];
    const [draggedItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    updateNodeData(id, { outputColumnOrder: newOrder });
  }, [outputColumnOrder, id, updateNodeData]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number, columnType: 'input' | 'output') => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${columnType}-${index}`);
    setDraggedColumn({type: columnType, index});
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number, columnType: 'input' | 'output') => {
    e.preventDefault();
    e.stopPropagation();
    const dragData = e.dataTransfer.getData('text/plain');
    const [type, dragIndexStr] = dragData.split('-');
    if (type === columnType) {
      const dragIndex = parseInt(dragIndexStr);
      if (columnType === 'input') {
        reorderInputColumns(dragIndex, dropIndex);
      } else {
        reorderOutputColumns(dragIndex, dropIndex);
      }
    }
    setDraggedColumn(null);
  }, [reorderInputColumns, reorderOutputColumns]);

  const handleInputSpacingMouseDown = useCallback(
    (e: React.MouseEvent, portId: string, currentSpacing: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedPort(portId);
      dragStartY.current = e.clientY;
      dragStartSpacing.current = currentSpacing || 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - dragStartY.current;
        const newSpacing = Math.max(0, dragStartSpacing.current + deltaY);
        const newInputs = data.inputs.map((port) =>
          port.id === portId ? { ...port, spacing: newSpacing } : port
        );
        updateNodeData(id, { inputs: newInputs });
        updateNodeInternals(id);
      };

      const handleMouseUp = () => {
        setDraggedPort(null);
        setTimeout(() => updateNodeInternals(id), 0);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [id, data.inputs, updateNodeData, updateNodeInternals]
  );

  const handleOutputSpacingMouseDown = useCallback(
    (e: React.MouseEvent, portId: string, currentSpacing: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedPort(portId);
      dragStartY.current = e.clientY;
      dragStartSpacing.current = currentSpacing || 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - dragStartY.current;
        const newSpacing = Math.max(0, dragStartSpacing.current + deltaY);
        const newOutputs = data.outputs.map((port) =>
          port.id === portId ? { ...port, spacing: newSpacing } : port
        );
        updateNodeData(id, { outputs: newOutputs });
        updateNodeInternals(id);
      };

      const handleMouseUp = () => {
        setDraggedPort(null);
        setTimeout(() => updateNodeInternals(id), 0);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [id, data.outputs, updateNodeData, updateNodeInternals]
  );

  const renderInputField = useCallback((port: ProcessorPort, fieldName: InputFieldType) => {
    const config = INPUT_FIELD_CONFIG[fieldName];
    const style = { flex: config.flex, minWidth: `${config.minWidth}px` };

    switch (fieldName) {
      case 'connection':
        return (
          <EditableSelect
            key={fieldName}
            value={port.connection || ''}
            options={sourcesWithColors}
            onChange={(value) => updateInput(port.id, 'connection', value)}
            placeholder="Select Source"
            className={`port-field ${config.className}`}
            style={style}
          />
        );
      case 'name':
        return (
          <input
            key={fieldName}
            value={port.name}
            onChange={(e) => updateInput(port.id, 'name', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
            placeholder="Input #"
          />
        );
      case 'resolution':
        return VIDEO_RESOLUTIONS.includes(port.resolution as any) && port.resolution !== 'Custom' ? (
          <select
            key={fieldName}
            value={port.resolution || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith('__setall__:')) {
                const resolution = value.replace('__setall__:', '');
                setAllInputResolutions(resolution);
              } else {
                updateInput(port.id, 'resolution', value);
              }
            }}
            className={`port-field ${config.className}`}
            style={style}
          >
            <option value="">Select Resolution</option>
            {VIDEO_RESOLUTIONS.map((res) => (
              <option key={res} value={res}>{res}</option>
            ))}
            <optgroup label="── Set All Inputs ──">
              {VIDEO_RESOLUTIONS.filter(r => r !== 'Custom').map((res) => (
                <option key={`setall-${res}`} value={`__setall__:${res}`}>{res}</option>
              ))}
            </optgroup>
          </select>
        ) : (
          <input
            key={fieldName}
            value={port.resolution || ''}
            onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
            placeholder="Custom Resolution"
          />
        );
    }
  }, [updateInput, sourcesWithColors, setAllInputResolutions]);

  const renderOutputField = useCallback((port: ProcessorPort, fieldName: OutputFieldType) => {
    const config = OUTPUT_FIELD_CONFIG[fieldName];
    const style = { flex: config.flex, minWidth: `${config.minWidth}px` };

    switch (fieldName) {
      case 'destination':
        return (
          <EditableSelect
            key={fieldName}
            value={port.destination || ''}
            options={sourcesWithColors}
            onChange={(value) => updateOutput(port.id, 'destination', value)}
            placeholder="Select Source"
            className={`port-field ${config.className}`}
            style={style}
          />
        );
      case 'name':
        return (
          <input
            key={fieldName}
            value={port.name}
            onChange={(e) => updateOutput(port.id, 'name', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
            placeholder="Output #"
          />
        );
      case 'resolution':
        return VIDEO_RESOLUTIONS.includes(port.resolution as any) && port.resolution !== 'Custom' ? (
          <select
            key={fieldName}
            value={port.resolution || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith('__setall__:')) {
                const resolution = value.replace('__setall__:', '');
                setAllOutputResolutions(resolution);
              } else {
                updateOutput(port.id, 'resolution', value);
              }
            }}
            className={`port-field ${config.className}`}
            style={style}
          >
            <option value="">Select Resolution</option>
            {VIDEO_RESOLUTIONS.map((res) => (
              <option key={res} value={res}>{res}</option>
            ))}
            <optgroup label="── Set All Outputs ──">
              {VIDEO_RESOLUTIONS.filter(r => r !== 'Custom').map((res) => (
                <option key={`setall-${res}`} value={`__setall__:${res}`}>{res}</option>
              ))}
            </optgroup>
          </select>
        ) : (
          <input
            key={fieldName}
            value={port.resolution || ''}
            onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
            placeholder="Custom Resolution"
          />
        );
    }
  }, [updateOutput, sourcesWithColors, setAllOutputResolutions]);

  const layout = data.layout || 'sideBySide';

  // DOM-measured handle positioning
  const nodeRef = useRef<HTMLDivElement>(null);
  const { rowRef, positions: handlePositions } = useHandlePositions(
    nodeRef,
    [data.inputs, data.outputs, layout, width, height]
  );

  // Build handles outside contentRef
  const handles = (
    <>
      {data.inputs.map((port) => (
        <Handle
          key={`input-${port.id}`}
          type="target"
          position={Position.Left}
          id={`input-${port.id}`}
          className="port-handle"
          style={{ top: handlePositions[`input-${port.id}`] ?? 0 }}
        />
      ))}
      {data.outputs.map((port) => (
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
      nodeClassName="node-switcher"
      defaultColor="#4a148c"
      data={data}
      minWidth={280}
      minHeight={120}
      placeholder="Switcher Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      onReset={handleReset}
      extraClassName={layout === 'sideBySide' ? 'side-by-side' : ''}
      showIpRow
      ipAddress={data.ipAddress}
      onIpChange={updateIpAddress}
      showSystemsHeader={false}
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
      <div className="switcher-content nodrag">
        {/* Inputs Column */}
        <div className="switcher-column inputs">
          <div className="column-header">
            <span>INPUTS</span>
            {!isLocked && <button className="add-btn" onClick={addInput}>+</button>}
          </div>
          <div className="switcher-field-headers">
            {inputColumnOrder.map((fieldName, index) => {
              const config = INPUT_FIELD_CONFIG[fieldName];
              const isDragging = draggedColumn?.type === 'input' && draggedColumn?.index === index;

              if (fieldName === 'resolution') {
                return (
                  <div
                    key={fieldName}
                    className={`field-header ${config.className} draggable nodrag ${isDragging ? 'dragging' : ''}`}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index, 'input')}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index, 'input')}
                    style={{
                      flex: config.flex,
                      minWidth: `${config.minWidth}px`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{config.label}</span>
                    <select
                      className="set-all-resolution nodrag"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setAllInputResolutions(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title="Set all input resolutions"
                    >
                      <option value="">All</option>
                      {VIDEO_RESOLUTIONS.map((res) => (
                        <option key={res} value={res}>{res}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <span
                  key={fieldName}
                  className={`field-header ${config.className} draggable nodrag ${isDragging ? 'dragging' : ''}`}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, index, 'input')}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index, 'input')}
                  style={{
                    flex: config.flex,
                    minWidth: `${config.minWidth}px`
                  }}
                  role="button"
                  aria-label={`Drag to reorder ${config.label} column`}
                >
                  {config.label}
                </span>
              );
            })}
          </div>
          <div className="port-list">
            {data.inputs.map((port) => (
              <div key={port.id} style={{ marginTop: `${port.spacing || 0}px` }}>
                <div ref={rowRef(`input-${port.id}`)} className="port-row" style={isLocked ? { paddingRight: '10px' } : undefined}>
                  <div
                    className="spacing-drag-handle nodrag"
                    onMouseDown={(e) => handleInputSpacingMouseDown(e, port.id, port.spacing || 0)}
                    title="Drag down to move row and create space above"
                  >
                    ⋮
                  </div>
                  {inputColumnOrder.map((fieldName) => renderInputField(port, fieldName))}
                  {!isLocked && <button className="remove-btn" onClick={() => removeInput(port.id)}>×</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs Column */}
        <div className="switcher-column outputs">
          <div className="column-header">
            <span>OUTPUTS</span>
            {!isLocked && <button className="add-btn" onClick={addOutput}>+</button>}
          </div>
          <div className="switcher-field-headers">
            {outputColumnOrder.map((fieldName, index) => {
              const config = OUTPUT_FIELD_CONFIG[fieldName];
              const isDragging = draggedColumn?.type === 'output' && draggedColumn?.index === index;

              if (fieldName === 'resolution') {
                return (
                  <div
                    key={fieldName}
                    className={`field-header ${config.className} draggable nodrag ${isDragging ? 'dragging' : ''}`}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index, 'output')}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index, 'output')}
                    style={{
                      flex: config.flex,
                      minWidth: `${config.minWidth}px`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{config.label}</span>
                    <select
                      className="set-all-resolution nodrag"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setAllOutputResolutions(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title="Set all output resolutions"
                    >
                      <option value="">All</option>
                      {VIDEO_RESOLUTIONS.map((res) => (
                        <option key={res} value={res}>{res}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <span
                  key={fieldName}
                  className={`field-header ${config.className} draggable nodrag ${isDragging ? 'dragging' : ''}`}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, index, 'output')}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index, 'output')}
                  style={{
                    flex: config.flex,
                    minWidth: `${config.minWidth}px`
                  }}
                  role="button"
                  aria-label={`Drag to reorder ${config.label} column`}
                >
                  {config.label}
                </span>
              );
            })}
          </div>
          <div className="port-list">
            {data.outputs.map((port) => (
              <div key={port.id} style={{ marginTop: `${port.spacing || 0}px` }}>
                <div ref={rowRef(`output-${port.id}`)} className="port-row output" style={isLocked ? { paddingRight: '10px' } : undefined}>
                  <div
                    className="spacing-drag-handle nodrag"
                    onMouseDown={(e) => handleOutputSpacingMouseDown(e, port.id, port.spacing || 0)}
                    title="Drag down to move row and create space above"
                  >
                    ⋮
                  </div>
                  {outputColumnOrder.map((fieldName) => renderOutputField(port, fieldName))}
                  {!isLocked && <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(SwitcherNode);
