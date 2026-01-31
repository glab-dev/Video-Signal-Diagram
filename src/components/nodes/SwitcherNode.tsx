import { memo, useCallback, useState, useRef, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow, NodeResizer, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { ProcessorNodeData, ProcessorPort, InputFieldType, OutputFieldType, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';
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

type SwitcherNodeProps = NodeProps & {
  data: ProcessorNodeData;
};

function SwitcherNode({ id, data, selected, width, height }: SwitcherNodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeSummaries = useNodeSummariesContext();
  const { sources: permanentSources } = usePermanentSources();

  // Get sources with colors - category overrides + pure source nodes (output-only)
  const sourcesWithColors = useMemo(() => {
    // Start with category overrides marked as 'source'
    const overrides = permanentSources
      .filter(s => s.category === 'source')
      .map(s => ({ label: s.name, color: s.color }));

    // Skip nodes with destination override
    const destinationOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'destination').map(s => s.name)
    );

    // Add dynamic sources from nodes
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
      .map(n => ({ label: n.label, color: n.color }));

    // Merge and deduplicate (overrides take precedence)
    const all = [...overrides, ...dynamic];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

  const nodeColor = data.color || '#0088cc';

  // Handle drag start for category override drop zone
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

  // Set all input resolutions at once
  const setAllInputResolutions = useCallback(
    (resolution: string) => {
      const newInputs = data.inputs.map((port) => ({ ...port, resolution }));
      updateNodeData(id, { inputs: newInputs });
    },
    [id, data.inputs, updateNodeData]
  );

  // Set all output resolutions at once
  const setAllOutputResolutions = useCallback(
    (resolution: string) => {
      const newOutputs = data.outputs.map((port) => ({ ...port, resolution }));
      updateNodeData(id, { outputs: newOutputs });
    },
    [id, data.outputs, updateNodeData]
  );

  // Toggle layout between stacked and side-by-side
  const toggleLayout = useCallback(() => {
    const newLayout = data.layout === 'sideBySide' ? 'stacked' : 'sideBySide';
    updateNodeData(id, { layout: newLayout });
    // Force React Flow to update handle positions after layout change
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
    // Reset to default configuration
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

  // Vertical Space Tab feature - for spacing between rows
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

  // Vertical Space Tab handlers for inputs
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
        // Force React Flow to update handle positions in real-time during drag
        updateNodeInternals(id);
      };

      const handleMouseUp = () => {
        setDraggedPort(null);
        // Force React Flow to update handle positions after spacing change
        setTimeout(() => updateNodeInternals(id), 0);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [id, data.inputs, updateNodeData, updateNodeInternals]
  );

  // Vertical Space Tab handlers for outputs
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
        // Force React Flow to update handle positions in real-time during drag
        updateNodeInternals(id);
      };

      const handleMouseUp = () => {
        setDraggedPort(null);
        // Force React Flow to update handle positions after spacing change
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
  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);

  return (
    <div
      className={`node-switcher ${selected ? 'selected' : ''} ${layout === 'sideBySide' ? 'side-by-side' : ''}`}
      style={{
        borderColor: data.color || '#4a148c',
        width: nodeWidth,
        height: nodeHeight,
      }}
    >
      <div ref={contentRef} style={scaleStyle}>
      <div className="node-header" style={{ backgroundColor: data.color || '#4a148c' }}>
        <EditableTitle value={data.label} placeholder="Switcher Name" onChange={updateLabel} className="node-title light" />
        <button
          className="layout-toggle-btn nodrag"
          onClick={toggleLayout}
          title={layout === 'stacked' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
        >
          {layout === 'stacked' ? '⇄' : '⇅'}
        </button>
        <PresetMenu
          nodeType="processor"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
          onReset={handleReset}
        />
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
            className={`color-btn ${(data.color || '#4a148c') === color ? 'active' : ''}`}
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

              // Special handling for resolution column - add "Set All" dropdown
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
                <div className="port-row" style={isLocked ? { paddingRight: '10px' } : undefined}>
                  <div
                    className="spacing-drag-handle nodrag"
                    onMouseDown={(e) => handleInputSpacingMouseDown(e, port.id, port.spacing || 0)}
                    title="Drag down to move row and create space above"
                  >
                    ⋮
                  </div>
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`input-${port.id}`}
                    className="port-handle left"
                  />
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

              // Special handling for resolution column - add "Set All" dropdown
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
                <div className="port-row output" style={isLocked ? { paddingRight: '10px' } : undefined}>
                  <div
                    className="spacing-drag-handle nodrag"
                    onMouseDown={(e) => handleOutputSpacingMouseDown(e, port.id, port.spacing || 0)}
                    title="Drag down to move row and create space above"
                  >
                    ⋮
                  </div>
                  {outputColumnOrder.map((fieldName) => renderOutputField(port, fieldName))}
                  {!isLocked && <button className="remove-btn" onClick={() => removeOutput(port.id)}>×</button>}
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`output-${port.id}`}
                    className="port-handle right"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      <NodeResizer
        minWidth={280}
        minHeight={120}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff' }}
      />
    </div>
  );
}

export default memo(SwitcherNode);
