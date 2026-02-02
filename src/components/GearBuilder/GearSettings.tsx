import type { GearConfig, CustomNodeType } from '../../types';

const NODE_TYPES: { value: CustomNodeType; label: string }[] = [
  { value: 'barcoE3', label: 'Barco E3' },
  { value: 'supernode', label: 'Supernode' },
];

interface GearSettingsProps {
  config: GearConfig;
  onUpdate: (updates: Partial<GearConfig>) => void;
  colors: string[];
}

function GearSettings({ config, onUpdate, colors }: GearSettingsProps) {
  return (
    <div className="gear-settings">
      <div className="gear-field">
        <label>Node Type</label>
        <select
          value={config.nodeType}
          onChange={(e) => onUpdate({ nodeType: e.target.value as CustomNodeType })}
          className="gear-select"
        >
          {NODE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="gear-field">
        <label>Label</label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="gear-input"
          placeholder="Node label"
        />
      </div>

      <div className="gear-field">
        <label>Color</label>
        <div className="gear-color-picker">
          {colors.map((color) => (
            <button
              key={color}
              className={`gear-color-btn ${config.color === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onUpdate({ color })}
            />
          ))}
        </div>
      </div>

      <div className="gear-field">
        <label>Layout</label>
        <div className="gear-layout-toggle">
          <button
            className={`layout-btn ${config.layout === 'stacked' ? 'active' : ''}`}
            onClick={() => onUpdate({ layout: 'stacked' })}
          >
            Stacked
          </button>
          <button
            className={`layout-btn ${config.layout === 'sideBySide' ? 'active' : ''}`}
            onClick={() => onUpdate({ layout: 'sideBySide' })}
          >
            Side by Side
          </button>
        </div>
      </div>

      <div className="gear-field">
        <label>IP Address</label>
        <input
          type="text"
          value={config.ipAddress || ''}
          onChange={(e) => onUpdate({ ipAddress: e.target.value })}
          className="gear-input"
          placeholder="192.168.1.100"
        />
      </div>

      <div className="gear-field">
        <label>Vertical Spacing: {config.verticalSpacing || 0}px</label>
        <input
          type="range"
          min="0"
          max="20"
          value={config.verticalSpacing || 0}
          onChange={(e) => onUpdate({ verticalSpacing: parseInt(e.target.value) })}
          className="gear-slider"
        />
      </div>
    </div>
  );
}

export default GearSettings;
