import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { RouterNodeData, RouterRow, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';
import EditableSelect from '../EditableSelect';

type RouterNodeProps = NodeProps & {
  data: RouterNodeData;
};

function RouterNode({ id, data, selected, width, height }: RouterNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();

  // Get sources with colors
  const sourcesWithColors = useMemo(() => {
    const sources = nodeSummaries
      .filter(n => n.id !== id && (n.hasOutputs || n.hasRows) && n.label)
      .map(n => ({ label: n.label, color: n.color }));
    const unique = sources.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id]);

  const sourceNames = useMemo(() => sourcesWithColors.map(s => s.label), [sourcesWithColors]);

  // Get destinations with colors
  const destinationsWithColors = useMemo(() => {
    const dests = nodeSummaries
      .filter(n => n.id !== id && (n.hasInputs || n.hasRows) && n.label)
      .map(n => ({ label: n.label, color: n.color }));
    const unique = dests.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id]);

  const destinationNames = useMemo(() => destinationsWithColors.map(d => d.label), [destinationsWithColors]);

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
      <NodeResizer
        minWidth={220}
        minHeight={120}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div ref={contentRef} style={scaleStyle}>
      <Handle type="target" position={Position.Left} id="input" />

      <div className="node-header">
        <EditableTitle value={data.label} placeholder="Router Name" onChange={updateLabel} className="node-title" />
        <PresetMenu
          nodeType="router"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
        />
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
    </div>
  );
}

export default memo(RouterNode);
