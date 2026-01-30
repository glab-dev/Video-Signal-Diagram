import { memo, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { RouterNodeData, RouterRow, NodeData } from '../../types';
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

type RouterNodeProps = NodeProps & {
  data: RouterNodeData;
};

function RouterNode({ id, data, selected, width, height }: RouterNodeProps) {
  const { updateNodeData } = useReactFlow();
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

  // Get destinations with colors - category overrides + pure destination nodes (input-only)
  const destinationsWithColors = useMemo(() => {
    // Start with category overrides marked as 'destination'
    const overrides = permanentSources
      .filter(s => s.category === 'destination')
      .map(s => ({ label: s.name, color: s.color }));

    // Skip nodes with source override
    const sourceOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'source').map(s => s.name)
    );

    const dests = nodeSummaries
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
      .map(n => ({ label: n.label, color: n.color }));

    // Merge and deduplicate
    const all = [...overrides, ...dests];
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

  const updateRow = useCallback(
    (rowId: string, field: keyof RouterRow, value: string) => {
      const newRows = data.rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      );
      updateNodeData(id, { rows: newRows });
    },
    [id, data.rows, updateNodeData]
  );

  const addRow = useCallback(() => {
    const newRow: RouterRow = {
      id: uuidv4(),
      source: '',
      inOut: String(data.rows.length + 1),
      destination: '',
    };
    updateNodeData(id, { rows: [...data.rows, newRow] });
  }, [id, data.rows, updateNodeData]);

  const removeRow = useCallback(
    (rowId: string) => {
      if (data.rows.length > 1) {
        updateNodeData(id, { rows: data.rows.filter((r) => r.id !== rowId) });
      }
    },
    [id, data.rows, updateNodeData]
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

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      updateNodeData(id, presetData as Partial<RouterNodeData>);
    },
    [id, updateNodeData]
  );

  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);

  return (
    <div
      className={`node-router ${selected ? 'selected' : ''}`}
      style={{
        borderColor: data.color || '#444',
        width: nodeWidth,
        height: nodeHeight,
      }}
    >
      <div ref={contentRef} style={scaleStyle}>
      <Handle type="target" position={Position.Left} id="input" />

      <div className="node-header" style={{ backgroundColor: data.color || '#444' }}>
        <EditableTitle value={data.label} placeholder="Router Name" onChange={updateLabel} className="node-title light" />
        <PresetMenu
          nodeType="router"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
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

      <div className="color-picker-row">
        {NODE_COLORS.map((color) => (
          <button
            key={color}
            className={`color-btn ${(data.color || '#444') === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => updateColor(color)}
          />
        ))}
      </div>

      <table className="router-table nodrag">
        <thead>
          <tr>
            <th>SOURCE</th>
            <th>IN/OUT</th>
            <th>DESTINATION</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <EditableSelect
                  value={row.source || ''}
                  options={sourcesWithColors}
                  onChange={(value) => updateRow(row.id, 'source', value)}
                  placeholder="Select Source"
                />
              </td>
              <td>
                <input
                  value={row.inOut}
                  onChange={(e) => updateRow(row.id, 'inOut', e.target.value)}
                  placeholder="#"
                  className="small-input"
                />
              </td>
              <td>
                <EditableSelect
                  value={row.destination || ''}
                  options={destinationsWithColors}
                  onChange={(value) => updateRow(row.id, 'destination', value)}
                  placeholder="Select Destination"
                />
              </td>
              <td>
                <button
                  className="remove-btn"
                  onClick={() => removeRow(row.id)}
                  title="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="add-row-btn" onClick={addRow}>
        + Add Row
      </button>

      <Handle type="source" position={Position.Right} id="output" />
      </div>
      <NodeResizer
        minWidth={220}
        minHeight={120}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(RouterNode);
