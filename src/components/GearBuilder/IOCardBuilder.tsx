import type { GearPort } from '../../types';

const PORT_TYPES = ['HDMI', 'SDI', 'DP', '12G SDI', '3G SDI', 'Fiber', 'NDI', 'Cat6'];
const RESOLUTIONS = [
  '1920x1080@60',
  '1920x1080@30',
  '3840x2160@60',
  '3840x2160@30',
  '1280x720@60',
  '2560x1440@60',
  '4096x2160@60',
];

interface IOCardBuilderProps {
  label: string;
  ports: GearPort[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<GearPort>) => void;
  onRemove: (id: string) => void;
}

function IOCardBuilder({ label, ports, onAdd, onUpdate, onRemove }: IOCardBuilderProps) {
  return (
    <div className="io-card-builder">
      <div className="io-card-header">
        <span className="io-card-label">{label}</span>
        <button className="io-add-btn" onClick={onAdd}>+</button>
      </div>

      {ports.length > 0 && (
        <div className="io-card-list">
          {ports.map((port, index) => (
            <div key={port.id} className="io-card-row">
              <span className="io-row-num">{index + 1}</span>
              <input
                type="text"
                value={port.name}
                onChange={(e) => onUpdate(port.id, { name: e.target.value })}
                className="io-name-input"
                placeholder="Name"
              />
              <select
                value={port.type || 'HDMI'}
                onChange={(e) => onUpdate(port.id, { type: e.target.value })}
                className="io-type-select"
              >
                {PORT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={port.resolution || '1920x1080@60'}
                onChange={(e) => onUpdate(port.id, { resolution: e.target.value })}
                className="io-resolution-select"
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res} value={res}>{res}</option>
                ))}
              </select>
              <button
                className="io-remove-btn"
                onClick={() => onRemove(port.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {ports.length === 0 && (
        <div className="io-card-empty">
          No {label.toLowerCase()} configured
        </div>
      )}
    </div>
  );
}

export default IOCardBuilder;
