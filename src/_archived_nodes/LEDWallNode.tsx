import { memo, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { LEDWallNodeData, NodeData } from '../../types';
import NodeShell from './NodeShell';

type LEDWallNodeProps = NodeProps & {
  data: LEDWallNodeData;
};

function LEDWallNode({ id, data, selected, width, height }: LEDWallNodeProps) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <NodeShell
      id={id}
      selected={selected}
      width={width}
      height={height}
      nodeType="ledWall"
      nodeClassName="node-led-wall"
      defaultColor="#ff6600"
      data={data}
      minWidth={160}
      minHeight={120}
      placeholder="LED Wall Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      showSystemsHeader={false}
      outsideHandles={
        <>
          <Handle type="target" position={Position.Left} id="input" />
          <Handle type="source" position={Position.Right} id="output" />
        </>
      }
    >
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
    </NodeShell>
  );
}

export default memo(LEDWallNode);
