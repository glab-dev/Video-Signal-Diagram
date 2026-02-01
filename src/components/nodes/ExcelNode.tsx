import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ExcelNodeData, ExcelRow, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';

type ExcelNodeProps = NodeProps & {
  data: ExcelNodeData;
};

const CHART_COLORS = [
  '#1a1a2e', '#2d132c', '#1e3a5f', '#0d3b2e',
  '#3d1a1a', '#2e2e1a', '#1a2e2e', '#2a1a3d',
];

const ACCENT_COLORS = [
  '#ff0000', '#00ff00', '#0088cc', '#ff6600',
  '#ff00ff', '#00ffff', '#ffff00', '#8800ff',
];

const CONNECTOR_TYPES = [
  'HDMI',
  '3G SDI',
  '12G SDI',
  'DisplayPort',
];

function ExcelNode({ id, data, selected }: ExcelNodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const chartColor = data.color || '#1a1a2e';
  const rows = data.rows || [];

  // ============================================
  // DATA CALLBACKS
  // ============================================
  const updateLabel = useCallback((value: string) => {
    updateNodeData(id, { label: value });
  }, [id, updateNodeData]);

  const updateColor = useCallback((color: string) => {
    updateNodeData(id, { color });
  }, [id, updateNodeData]);

  const handleLoadPreset = useCallback((presetData: NodeData) => {
    const excelData = presetData as ExcelNodeData;
    updateNodeData(id, {
      label: excelData.label,
      color: excelData.color,
      rows: excelData.rows,
      columns: excelData.columns,
    });
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, updateNodeData, updateNodeInternals]);

  const updateCell = useCallback((rowId: string, field: string, value: string) => {
    const newRows = rows.map((row) =>
      row.id === rowId
        ? { ...row, cells: { ...row.cells, [field]: value } }
        : row
    );
    updateNodeData(id, { rows: newRows });
  }, [id, rows, updateNodeData]);

  const addRow = useCallback(() => {
    const newRow: ExcelRow = {
      id: uuidv4(),
      cells: { source: 'HDMI', in: '', out: '' },
      handleSide: 'both',
    };
    updateNodeData(id, { rows: [...rows, newRow] });
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, rows, updateNodeData, updateNodeInternals]);

  const removeRow = useCallback((rowId: string) => {
    updateNodeData(id, { rows: rows.filter((r) => r.id !== rowId) });
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, rows, updateNodeData, updateNodeInternals]);

  // ============================================
  // RENDER - Simple, no scaling transforms
  // ============================================
  return (
    <div
      className={`excel-chart ${selected ? 'selected' : ''}`}
      style={{ backgroundColor: chartColor }}
    >
      {/* HEADER */}
      <div className="excel-chart-header">
        <EditableTitle
          value={data.label}
          placeholder="Chart Name"
          onChange={updateLabel}
          className="excel-chart-title"
        />
        <PresetMenu
          nodeType="excelNode"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
        />
      </div>

      {/* COLOR PICKER */}
      <div className="excel-chart-colors nodrag">
        {CHART_COLORS.map((color) => (
          <button
            key={color}
            className={`excel-chart-color ${chartColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => updateColor(color)}
          />
        ))}
        <span className="color-divider" />
        {ACCENT_COLORS.map((color) => (
          <button
            key={color}
            className={`excel-chart-color accent ${chartColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => updateColor(color)}
          />
        ))}
      </div>

      {/* SUB-HEADER ROW */}
      <div className="excel-chart-subheader">
        <div className="subheader-cell num">#</div>
        <div className="subheader-cell source">SOURCE</div>
        <div className="subheader-cell">IN</div>
        <div className="subheader-cell">OUT</div>
        <div className="subheader-actions" />
      </div>

      {/* DATA ROWS - Handles are INSIDE each row for proper alignment */}
      <div className="excel-chart-body nodrag">
        {rows.map((row, index) => (
          <div key={row.id} className="excel-chart-row">
            {/* Left Handle - IN */}
            <Handle
              type="target"
              position={Position.Left}
              id={`in-${row.id}`}
              className="excel-anchor"
            />

            {/* Row Number */}
            <div className="excel-num-cell">
              {index + 1}
            </div>

            {/* SOURCE Dropdown */}
            <div className="excel-source-cell">
              <select
                value={row.cells.source || 'HDMI'}
                onChange={(e) => updateCell(row.id, 'source', e.target.value)}
                className="excel-connector-select"
              >
                {CONNECTOR_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* IN Cell */}
            <div className="excel-data-cell">
              <input
                value={row.cells.in || ''}
                onChange={(e) => updateCell(row.id, 'in', e.target.value)}
                className="excel-cell-input"
                placeholder="—"
              />
            </div>

            {/* OUT Cell */}
            <div className="excel-data-cell">
              <input
                value={row.cells.out || ''}
                onChange={(e) => updateCell(row.id, 'out', e.target.value)}
                className="excel-cell-input"
                placeholder="—"
              />
            </div>

            {/* Row Actions */}
            <div className="excel-row-actions">
              <button className="excel-row-remove" onClick={() => removeRow(row.id)}>×</button>
            </div>

            {/* Right Handle - OUT */}
            <Handle
              type="source"
              position={Position.Right}
              id={`out-${row.id}`}
              className="excel-anchor"
            />
          </div>
        ))}
      </div>

      {/* ADD ROW */}
      <button className="excel-chart-add-row nodrag" onClick={addRow}>
        + Add Row
      </button>
    </div>
  );
}

export default memo(ExcelNode);
