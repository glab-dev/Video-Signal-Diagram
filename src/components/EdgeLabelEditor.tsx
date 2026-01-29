import { useState, useEffect, useRef } from 'react';

interface EdgeLabelEditorProps {
  initialLabel: string;
  onSave: (label: string) => void;
  onDeleteLabel: () => void;
  onDeleteConnection: () => void;
  onCancel: () => void;
}

export default function EdgeLabelEditor({
  initialLabel,
  onSave,
  onDeleteLabel,
  onDeleteConnection,
  onCancel,
}: EdgeLabelEditorProps) {
  const [label, setLabel] = useState(initialLabel);
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
      onSave(label);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="edge-editor-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Connection Label</h3>

        <input
          ref={inputRef}
          type="text"
          className="edge-label-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter label (optional)"
        />

        <div className="edge-editor-actions">
          <button className="edge-btn edge-btn-primary" onClick={() => onSave(label)}>
            OK
          </button>
          <button className="edge-btn edge-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <div className="edge-editor-divider"></div>

        <div className="edge-editor-danger-actions">
          <button className="edge-btn edge-btn-warning" onClick={onDeleteLabel}>
            Clear Label
          </button>
          <button className="edge-btn edge-btn-danger" onClick={onDeleteConnection}>
            Delete Connection
          </button>
        </div>
      </div>
    </div>
  );
}
