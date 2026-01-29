import { useState, useEffect, useRef } from 'react';

// Cable types for video signal connections
const CABLE_TYPES = [
  '',
  'HDMI',
  '3G SDI',
  '12G SDI',
  'DisplayPort',
  'OpticalCon Quad Fiber',
  'OpticalCon Dual Fiber',
  'SMPTE Fiber',
  'DVI',
  'Cat5',
  'Cat6A',
] as const;

// Cable lengths in feet
const CABLE_LENGTHS = [
  '',
  '3ft',
  '10ft',
  '15ft',
  '25ft',
  '50ft',
  '100ft',
  '150ft',
  '200ft',
  '250ft',
  '300ft',
  '500ft',
  '1000ft',
] as const;

export interface EdgeData {
  label?: string;
  cableType?: string;
  cableLength?: string;
}

interface EdgeLabelEditorProps {
  initialLabel: string;
  initialCableType?: string;
  initialCableLength?: string;
  onSave: (data: EdgeData) => void;
  onDeleteLabel?: () => void;
  onDeleteConnection?: () => void;
  onCancel: () => void;
  isNewConnection?: boolean;
}

export default function EdgeLabelEditor({
  initialLabel,
  initialCableType = '',
  initialCableLength = '',
  onSave,
  onDeleteLabel,
  onDeleteConnection,
  onCancel,
  isNewConnection = false,
}: EdgeLabelEditorProps) {
  const [label, setLabel] = useState(initialLabel);
  const [cableType, setCableType] = useState(initialCableType);
  const [cableLength, setCableLength] = useState(initialCableLength);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input and select text when modal opens
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave({ label, cableType, cableLength });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="edge-editor-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNewConnection ? 'New Connection' : 'Edit Connection'}</h3>

        <div className="edge-editor-field">
          <label>Label</label>
          <input
            ref={inputRef}
            type="text"
            className="edge-label-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter label (optional)"
          />
        </div>

        <div className="edge-editor-row">
          <div className="edge-editor-field">
            <label>Cable Type</label>
            <select
              className="edge-select"
              value={cableType}
              onChange={(e) => setCableType(e.target.value)}
            >
              <option value="">Select Cable Type</option>
              {CABLE_TYPES.filter(t => t).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="edge-editor-field">
            <label>Cable Length</label>
            <select
              className="edge-select"
              value={cableLength}
              onChange={(e) => setCableLength(e.target.value)}
            >
              <option value="">Select Length</option>
              {CABLE_LENGTHS.filter(l => l).map((length) => (
                <option key={length} value={length}>{length}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="edge-editor-actions">
          <button className="edge-btn edge-btn-primary" onClick={() => onSave({ label, cableType, cableLength })}>
            OK
          </button>
          <button className="edge-btn edge-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>

        {!isNewConnection && (
          <>
            <div className="edge-editor-divider"></div>

            <div className="edge-editor-danger-actions">
              <button className="edge-btn edge-btn-warning" onClick={onDeleteLabel}>
                Clear Label
              </button>
              <button className="edge-btn edge-btn-danger" onClick={onDeleteConnection}>
                Delete Connection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
