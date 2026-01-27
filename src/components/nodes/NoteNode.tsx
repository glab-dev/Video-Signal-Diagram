import { memo, useCallback } from 'react';
import { useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { NoteNodeData } from '../../types';

type NoteNodeProps = NodeProps & {
  data: NoteNodeData;
};

const NOTE_COLORS = [
  '#ffeb3b', // Yellow
  '#4caf50', // Green
  '#2196f3', // Blue
  '#ff9800', // Orange
  '#e91e63', // Pink
  '#9c27b0', // Purple
];

function NoteNode({ id, data, selected, measured }: NoteNodeProps) {
  const { updateNodeData } = useReactFlow();

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  const updateContent = useCallback(
    (value: string) => {
      updateNodeData(id, { content: value });
    },
    [id, updateNodeData]
  );

  const updateColor = useCallback(
    (color: string) => {
      updateNodeData(id, { backgroundColor: color });
    },
    [id, updateNodeData]
  );

  const bgColor = data.backgroundColor || '#ffeb3b';

  return (
    <div
      className={`node-note ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: bgColor,
        width: measured?.width,
        height: measured?.height,
      }}
    >
      <NodeResizer
        minWidth={160}
        minHeight={80}
        isVisible={selected}
        lineStyle={{ borderColor: '#333' }}
        handleStyle={{ backgroundColor: '#333', width: 8, height: 8 }}
      />
      <div className="note-header">
        <input
          className="note-title-input"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Note Title"
        />
        <div className="note-color-picker">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              className={`color-btn ${bgColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => updateColor(color)}
            />
          ))}
        </div>
      </div>
      <textarea
        className="note-content"
        value={data.content}
        onChange={(e) => updateContent(e.target.value)}
        placeholder="Enter notes here..."
      />
    </div>
  );
}

export default memo(NoteNode);
