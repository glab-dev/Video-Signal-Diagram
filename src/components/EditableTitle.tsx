import { useState, useRef, useCallback } from 'react';

interface EditableTitleProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function EditableTitle({ value, placeholder, onChange, className = 'node-title light' }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(value);
    setIsEditing(true);
    // Focus and select after render
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [value]);

  const finishEditing = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    }
    setIsEditing(false);
  }, [editValue, value, onChange]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [finishEditing, cancelEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={`editable-title-input nodrag ${className}`}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={finishEditing}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      className={`${className} editable-title`}
      onDoubleClick={startEditing}
      title="Double-click to edit"
    >
      {value || placeholder}
    </span>
  );
}
