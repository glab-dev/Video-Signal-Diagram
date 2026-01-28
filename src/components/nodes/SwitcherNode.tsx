import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ProcessorNodeData, ProcessorPort, InputFieldType, OutputFieldType } from '../../types';
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

  // Column ordering
  const inputColumnOrder = data.inputColumnOrder || ['connection', 'name', 'resolution'];
  const outputColumnOrder = data.outputColumnOrder || ['destination', 'name', 'resolution'];

  const [draggedColumn, setDraggedColumn] = useState<{type: 'input' | 'output', index: number} | null>(null);

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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${columnType}-${index}`);
    setDraggedColumn({type: columnType, index});
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number, columnType: 'input' | 'output') => {
    e.preventDefault();
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

  const renderInputField = useCallback((port: ProcessorPort, fieldName: InputFieldType) => {
    const config = INPUT_FIELD_CONFIG[fieldName];
    const style = { flex: config.flex, minWidth: `${config.minWidth}px` };

    switch (fieldName) {
      case 'connection':
        return (
          <input
            key={fieldName}
            value={port.connection}
            onChange={(e) => updateInput(port.id, 'connection', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
            placeholder="Source"
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
            onChange={(e) => updateInput(port.id, 'resolution', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
          >
            <option value="">Select Resolution</option>
            {VIDEO_RESOLUTIONS.map((res) => (
              <option key={res} value={res}>{res}</option>
            ))}
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
  }, [updateInput]);

  const renderOutputField = useCallback((port: ProcessorPort, fieldName: OutputFieldType) => {
    const config = OUTPUT_FIELD_CONFIG[fieldName];
    const style = { flex: config.flex, minWidth: `${config.minWidth}px` };

    switch (fieldName) {
      case 'destination':
        return (
          <input
            key={fieldName}
            value={port.destination || ''}
            onChange={(e) => updateOutput(port.id, 'destination', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
            placeholder="Source"
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
            onChange={(e) => updateOutput(port.id, 'resolution', e.target.value)}
            className={`port-field ${config.className}`}
            style={style}
          >
            <option value="">Select Resolution</option>
            {VIDEO_RESOLUTIONS.map((res) => (
              <option key={res} value={res}>{res}</option>
            ))}
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
  }, [updateOutput]);

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
            {inputColumnOrder.map((fieldName, index) => {
              const config = INPUT_FIELD_CONFIG[fieldName];
              const isDragging = draggedColumn?.type === 'input' && draggedColumn?.index === index;
              return (
                <span
                  key={fieldName}
                  className={`field-header ${config.className} draggable ${isDragging ? 'dragging' : ''}`}
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
              <div key={port.id} className="port-row">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`input-${port.id}`}
                  className="port-handle left"
                />
                {inputColumnOrder.map((fieldName) => renderInputField(port, fieldName))}
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
            {outputColumnOrder.map((fieldName, index) => {
              const config = OUTPUT_FIELD_CONFIG[fieldName];
              const isDragging = draggedColumn?.type === 'output' && draggedColumn?.index === index;
              return (
                <span
                  key={fieldName}
                  className={`field-header ${config.className} draggable ${isDragging ? 'dragging' : ''}`}
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
              <div key={port.id} className="port-row output">
                {outputColumnOrder.map((fieldName) => renderOutputField(port, fieldName))}
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
