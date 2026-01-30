import { memo, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { LEDWallNodeData, NodeData } from '../../types';
import PresetMenu from '../PresetMenu';
import { useNodeScale } from '../../hooks/useNodeScale';
import EditableTitle from '../EditableTitle';

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

type LEDWallNodeProps = NodeProps & {
  data: LEDWallNodeData;
};

function LEDWallNode({ id, data, selected, width, height }: LEDWallNodeProps) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const ledWallData = presetData as LEDWallNodeData;
      updateNodeData(id, {
        label: ledWallData.label,
        color: ledWallData.color,
        imageUrl: ledWallData.imageUrl,
        width: ledWallData.width,
        height: ledWallData.height
      });
    },
    [id, updateNodeData]
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          updateNodeData(id, { imageUrl });
        };
        reader.readAsDataURL(file);
      }
    },
    [id, updateNodeData]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);

  return (
    <div
      className={`node-led-wall ${selected ? 'selected' : ''}`}
      style={{
        borderColor: data.color || '#ff6600',
        width: nodeWidth,
        height: nodeHeight,
      }}
    >
      <NodeResizer
        minWidth={160}
        minHeight={120}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div ref={contentRef} style={scaleStyle}>
      <Handle type="target" position={Position.Left} id="input" />

      <div className="node-header" style={{ backgroundColor: data.color || '#ff6600' }}>
        <EditableTitle value={data.label} placeholder="LED Wall Name" onChange={updateLabel} className="node-title light" />
        <PresetMenu
          nodeType="ledWall"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
        />
      </div>

      <div className="color-picker-row">
        {NODE_COLORS.map((color) => (
          <button
            key={color}
            className={`color-btn ${(data.color || '#ff6600') === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => updateColor(color)}
          />
        ))}
      </div>

      <div className="led-wall-content">
        {data.imageUrl ? (
          <div className="led-wall-image-container">
            <img src={data.imageUrl} alt={data.label} className="led-wall-image" />
            <button className="change-image-btn" onClick={triggerFileInput}>
              Change Image
            </button>
          </div>
        ) : (
          <div className="led-wall-placeholder" onClick={triggerFileInput}>
            <span>Click to add raster image</span>
            <span className="placeholder-icon">🖼️</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      <Handle type="source" position={Position.Right} id="output" />
      </div>
    </div>
  );
}

export default memo(LEDWallNode);
