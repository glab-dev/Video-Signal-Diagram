import type { PaperSize, Orientation } from '../types';
import { PAPER_SIZES } from '../types';

interface RightPanelProps {
  paperSize: PaperSize;
  orientation: Orientation;
  customWidth: number;
  customHeight: number;
  onPaperSizeChange: (size: PaperSize) => void;
  onOrientationChange: (orientation: Orientation) => void;
  onCustomSizeChange: (width: number, height: number) => void;
}

export default function RightPanel({
  paperSize,
  orientation,
  customWidth,
  customHeight,
  onPaperSizeChange,
  onOrientationChange,
  onCustomSizeChange,
}: RightPanelProps) {
  // Get current canvas dimensions
  const getCurrentDimensions = () => {
    let dims = PAPER_SIZES[paperSize];

    if (paperSize === 'Custom') {
      dims = { width: customWidth, height: customHeight };
    }

    if (orientation === 'landscape') {
      return {
        width: Math.max(dims.width, dims.height),
        height: Math.min(dims.width, dims.height),
      };
    }
    return {
      width: Math.min(dims.width, dims.height),
      height: Math.max(dims.width, dims.height),
    };
  };

  const currentDims = getCurrentDimensions();

  return (
    <div className="right-panel">
      <div className="sidebar-header">
        <h2>Canvas Settings</h2>
      </div>

      {/* Paper Size Selection */}
      <div className="sidebar-section">
        <label>Paper Size</label>
        <select
          value={paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
        >
          <option value="Letter">Letter (8.5" × 11")</option>
          <option value="Legal">Legal (8.5" × 14")</option>
          <option value="Tabloid">Tabloid (11" × 17")</option>
          <option value="A4">A4 (210mm × 297mm)</option>
          <option value="A3">A3 (297mm × 420mm)</option>
          <option value="A2">A2 (420mm × 594mm)</option>
          <option value="Custom">Custom</option>
        </select>

        {/* Custom size inputs */}
        {paperSize === 'Custom' && (
          <div style={{ marginTop: '12px' }}>
            <label>Width (px)</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) =>
                onCustomSizeChange(parseInt(e.target.value) || 1200, customHeight)
              }
              min="100"
              max="10000"
            />
            <label style={{ marginTop: '8px' }}>Height (px)</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) =>
                onCustomSizeChange(customWidth, parseInt(e.target.value) || 1200)
              }
              min="100"
              max="20000"
            />
          </div>
        )}
      </div>

      {/* Orientation */}
      <div className="sidebar-section">
        <label>Orientation</label>
        <div className="orientation-toggle">
          <button
            className={`orientation-btn ${orientation === 'portrait' ? 'active' : ''}`}
            onClick={() => onOrientationChange('portrait')}
          >
            Portrait
          </button>
          <button
            className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
            onClick={() => onOrientationChange('landscape')}
          >
            Landscape
          </button>
        </div>
      </div>

      {/* Canvas Dimensions Display */}
      <div className="sidebar-section">
        <label>Canvas Dimensions</label>
        <div className="canvas-dimensions">
          <div>{currentDims.width} × {currentDims.height} px</div>
        </div>
      </div>
    </div>
  );
}
