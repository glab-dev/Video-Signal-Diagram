import { useState } from 'react';

// Dash pattern options
const DASH_PATTERNS = [
  { value: '', label: 'Solid (No Dash)' },
  { value: '5,5', label: 'Dashed (5-5)' },
  { value: '10,5', label: 'Long Dash (10-5)' },
  { value: '2,2', label: 'Dotted (2-2)' },
  { value: '10,5,2,5', label: 'Dash-Dot' },
  { value: '15,5,5,5', label: 'Long-Short' },
] as const;

export interface EdgeStyleOptions {
  showOutline: boolean;
  dashPattern: string;
  animated: boolean;
}

interface EdgeStyleEditorProps {
  selectedCount: number;
  initialOptions: EdgeStyleOptions;
  onApply: (options: EdgeStyleOptions) => void;
  onCancel: () => void;
}

export default function EdgeStyleEditor({
  selectedCount,
  initialOptions,
  onApply,
  onCancel,
}: EdgeStyleEditorProps) {
  const [showOutline, setShowOutline] = useState(initialOptions.showOutline);
  const [dashPattern, setDashPattern] = useState(initialOptions.dashPattern);
  const [animated, setAnimated] = useState(initialOptions.animated);

  const handleApply = () => {
    onApply({ showOutline, dashPattern, animated });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="edge-style-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edge Style Settings</h3>
        <p className="edge-style-count">{selectedCount} connection{selectedCount !== 1 ? 's' : ''} selected</p>

        <div className="edge-style-options">
          {/* White Outline Toggle */}
          <label className="edge-style-toggle">
            <input
              type="checkbox"
              checked={showOutline}
              onChange={(e) => setShowOutline(e.target.checked)}
            />
            <span className="toggle-label">
              <span className="toggle-title">White Outline</span>
              <span className="toggle-desc">Add a 1-2px white stroke around lines</span>
            </span>
          </label>

          {/* Dash Pattern Selector */}
          <div className="edge-style-field">
            <label className="field-label">Dash Pattern</label>
            <select
              className="edge-style-select"
              value={dashPattern}
              onChange={(e) => setDashPattern(e.target.value)}
            >
              {DASH_PATTERNS.map((pattern) => (
                <option key={pattern.value} value={pattern.value}>
                  {pattern.label}
                </option>
              ))}
            </select>
            <span className="field-desc">Different patterns help distinguish cables</span>
          </div>

          {/* Animation Toggle */}
          <label className="edge-style-toggle">
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
            />
            <span className="toggle-label">
              <span className="toggle-title">Data Flow Animation</span>
              <span className="toggle-desc">Subtle animated movement along the line</span>
            </span>
          </label>
        </div>

        <div className="edge-style-actions">
          <button className="edge-btn edge-btn-primary" onClick={handleApply}>
            Apply to Selected
          </button>
          <button className="edge-btn edge-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
