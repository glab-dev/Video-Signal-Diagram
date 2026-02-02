import { memo, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import type { RouterNodeData, RouterRow, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import NodeShell from './NodeShell';
import EditableSelect from '../EditableSelect';

type RouterNodeProps = NodeProps & {
  data: RouterNodeData;
};

function RouterNode({ id, data, selected, width, height }: RouterNodeProps) {
  const { updateNodeData } = useReactFlow();
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

  // Get destinations with colors
  const destinationsWithColors = useMemo(() => {
    const overrides = permanentSources
      .filter(s => s.category === 'destination')
      .map(s => ({ label: s.name, color: s.color }));

    const sourceOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'source').map(s => s.name)
    );

    const dests = nodeSummaries
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
      .map(n => ({ label: n.label, color: n.color }));

    const all = [...overrides, ...dests];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

  const nodeColor = data.color || '#0088cc';
  const rows = data.rows || [];

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
      const newRows = rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      );
      updateNodeData(id, { rows: newRows });
    },
    [id, rows, updateNodeData]
  );

  const addRow = useCallback(() => {
    const newRow: RouterRow = {
      id: uuidv4(),
      source: '',
      inOut: String(rows.length + 1),
      destination: '',
    };
    updateNodeData(id, { rows: [...rows, newRow] });
  }, [id, rows, updateNodeData]);

  const removeRow = useCallback(
    (rowId: string) => {
      if (rows.length > 1) {
        updateNodeData(id, { rows: rows.filter((r) => r.id !== rowId) });
      }
    },
    [id, rows, updateNodeData]
  );

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      updateNodeData(id, presetData as Partial<RouterNodeData>);
    },
    [id, updateNodeData]
  );

  return (
    <NodeShell
      id={id}
      selected={selected}
      width={width}
      height={height}
      nodeType="router"
      nodeClassName="node-router"
      defaultColor="#0088cc"
      data={data}
      minWidth={220}
      minHeight={120}
      placeholder="Router Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      outsideHandles={
        <>
          <Handle type="target" position={Position.Left} id="input" />
          <Handle type="source" position={Position.Right} id="output" />
        </>
      }
      headerButtons={
        <button
          className="category-drag-btn nodrag"
          draggable
          onDragStart={handleCategoryDragStart}
          title="Drag to Category Overrides to set as source/destination"
        >
          ⊕
        </button>
      }
    >
      {/* Router Table */}
      <div className="io-table-section">
        <div className="io-table-header">
          <span>ROUTING</span>
          <button className="add-btn" onClick={addRow}>+</button>
        </div>
        <table className="io-table nodrag">
          <thead>
            <tr>
              <th className="col-source">SOURCE</th>
              <th className="col-inout">IN/OUT</th>
              <th className="col-destination">DESTINATION</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="port-table-row">
                <td className="col-source">
                  <EditableSelect
                    value={row.source || ''}
                    options={sourcesWithColors}
                    onChange={(value) => updateRow(row.id, 'source', value)}
                    placeholder="Select Source"
                    className="table-select"
                  />
                </td>
                <td className="col-inout">
                  <input
                    value={row.inOut}
                    onChange={(e) => updateRow(row.id, 'inOut', e.target.value)}
                    placeholder="#"
                    className="table-input inout-input"
                  />
                </td>
                <td className="col-destination">
                  <EditableSelect
                    value={row.destination || ''}
                    options={destinationsWithColors}
                    onChange={(value) => updateRow(row.id, 'destination', value)}
                    placeholder="Select Destination"
                    className="table-select"
                  />
                </td>
                <td className="col-actions">
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
      </div>
    </NodeShell>
  );
}

export default memo(RouterNode);
