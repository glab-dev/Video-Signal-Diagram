import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { RouterNodeData, RouterRow, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';

type RouterNodeProps = NodeProps & {
  data: RouterNodeData;
};

function RouterNode({ id, data, selected, width, height }: RouterNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();

  const sourceNames = useMemo(() => {
    return nodeSummaries
      .filter(n => n.id !== id && (n.hasOutputs || n.hasRows) && n.label)
      .map(n => n.label)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [nodeSummaries, id]);

  const destinationNames = useMemo(() => {
    return nodeSummaries
      .filter(n => n.id !== id && (n.hasInputs || n.hasRows) && n.label)
      .map(n => n.label)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [nodeSummaries, id]);

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
        <input
          className="node-title-input"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Router Name"
        />
        <PresetMenu
          nodeType="router"
          currentData={data}
          onLoadPreset={handleLoadPreset}
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
                <select
                  value={sourceNames.includes(row.source) ? row.source : (row.source ? row.source : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      const customName = prompt('Enter custom source name:');
                      if (customName) {
                        updateRow(row.id, 'source', customName);
                      }
                    } else {
                      updateRow(row.id, 'source', e.target.value);
                    }
                  }}
                >
                  <option value="">Select Source</option>
                  {row.source && !sourceNames.includes(row.source) && (
                    <option value={row.source}>{row.source}</option>
                  )}
                  {sourceNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
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
                <select
                  value={destinationNames.includes(row.destination) ? row.destination : (row.destination ? row.destination : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      const customName = prompt('Enter custom destination name:');
                      if (customName) {
                        updateRow(row.id, 'destination', customName);
                      }
                    } else {
                      updateRow(row.id, 'destination', e.target.value);
                    }
                  }}
                >
                  <option value="">Select Destination</option>
                  {row.destination && !destinationNames.includes(row.destination) && (
                    <option value={row.destination}>{row.destination}</option>
                  )}
                  {destinationNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
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
