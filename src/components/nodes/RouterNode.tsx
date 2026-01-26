import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { RouterNodeData, RouterRow } from '../../types';
import { v4 as uuidv4 } from 'uuid';

type RouterNodeProps = NodeProps & {
  data: RouterNodeData;
};

function RouterNode({ id, data, selected }: RouterNodeProps) {
  const { updateNodeData } = useReactFlow();

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

  return (
    <div
      className={`node-router ${selected ? 'selected' : ''}`}
      style={{ borderColor: data.color || '#444' }}
    >
      <Handle type="target" position={Position.Left} id="input" />

      <div className="node-header">
        <input
          className="node-title-input"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Router Name"
        />
      </div>

      <table className="router-table">
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
                <input
                  value={row.source}
                  onChange={(e) => updateRow(row.id, 'source', e.target.value)}
                  placeholder="Source"
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
                <input
                  value={row.destination}
                  onChange={(e) => updateRow(row.id, 'destination', e.target.value)}
                  placeholder="Destination"
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
  );
}

export default memo(RouterNode);
