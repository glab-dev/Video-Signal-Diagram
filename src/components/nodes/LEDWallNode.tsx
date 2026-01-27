import { memo, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { LEDWallNodeData } from '../../types';

type LEDWallNodeProps = NodeProps & {
  data: LEDWallNodeData;
};

function LEDWallNode({ id, data, selected, measured }: LEDWallNodeProps) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
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

  return (
    <div
      className={`node-led-wall ${selected ? 'selected' : ''}`}
      style={{
        borderColor: data.color || '#ff6600',
        width: measured?.width,
        height: measured?.height,
      }}
    >
      <NodeResizer
        minWidth={160}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <Handle type="target" position={Position.Left} id="input" />

      <div className="node-header" style={{ backgroundColor: data.color || '#ff6600' }}>
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="LED Wall Name"
        />
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
  );
}

export default memo(LEDWallNode);
