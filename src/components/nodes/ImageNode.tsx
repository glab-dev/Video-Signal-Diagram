import { memo, useCallback, useRef } from 'react';
import { useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageNodeData, NodeData } from '../../types';
import PresetMenu from '../PresetMenu';

type ImageNodeProps = NodeProps & {
  data: ImageNodeData;
};

function ImageNode({ id, data, selected }: ImageNodeProps) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      const imageData = presetData as ImageNodeData;
      updateNodeData(id, {
        label: imageData.label,
        imageUrl: imageData.imageUrl,
        width: imageData.width,
        height: imageData.height
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
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={100}
      />
      <div className={`node-image ${selected ? 'selected' : ''}`}>
        <div className="image-label">
          <input
            className="image-label-input"
            value={data.label}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder="Image Label"
          />
          <PresetMenu
            nodeType="image"
            currentData={data}
            onLoadPreset={handleLoadPreset}
          />
        </div>
        {data.imageUrl ? (
          <div className="image-container" onDoubleClick={triggerFileInput}>
            <img src={data.imageUrl} alt={data.label} className="node-image-content" />
          </div>
        ) : (
          <div className="image-placeholder" onClick={triggerFileInput}>
            <span>Click to add image</span>
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
    </>
  );
}

export default memo(ImageNode);
