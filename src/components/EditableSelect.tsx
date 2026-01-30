import { useState, useRef, useCallback, useEffect } from 'react';

interface EditableSelectOption {
  label: string;
  color?: string;
}

interface EditableSelectProps {
  value: string;
  options: EditableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function EditableSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  style,
}: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen && !isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isEditing) {
          // Save on outside click
          const trimmed = editValue.trim();
          if (trimmed) {
            onChange(trimmed);
          }
          setIsEditing(false);
        }
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, isEditing, editValue, onChange]);

  // Sync editValue when value prop changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const startEditing = useCallback(() => {
    setEditValue(value);
    setIsEditing(true);
    setIsDropdownOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [value]);

  const finishEditing = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setIsEditing(false);
  }, [editValue, onChange]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        cancelEditing();
      }
    },
    [finishEditing, cancelEditing]
  );

  const toggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isEditing) {
        setIsEditing(false);
      }
      setIsDropdownOpen((prev) => !prev);
    },
    [isEditing]
  );

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsDropdownOpen(false);
      setIsEditing(false);
    },
    [onChange]
  );

  // Find color for the current value
  const currentOption = options.find((o) => o.label === value);
  const bgColor = currentOption?.color || undefined;
  const textColor = bgColor ? '#fff' : undefined;

  return (
    <div
      ref={containerRef}
      className={`editable-select nodrag ${className}`}
      style={{
        ...style,
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="editable-select-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          className={`editable-select-value ${!value ? 'placeholder' : ''}`}
          onClick={startEditing}
          title="Click to type a custom value"
        >
          {value || placeholder}
        </span>
      )}
      <button
        className="editable-select-arrow"
        onClick={toggleDropdown}
        onMouseDown={(e) => e.preventDefault()}
        tabIndex={-1}
        title="Open dropdown"
      >
        ▾
      </button>
      {isDropdownOpen && (
        <div ref={dropdownRef} className="editable-select-dropdown">
          <div
            className="editable-select-option clear-option"
            onClick={() => selectOption('')}
          >
            {placeholder}
          </div>
          {options.map((option) => (
            <div
              key={option.label}
              className={`editable-select-option ${option.label === value ? 'selected' : ''}`}
              style={{
                backgroundColor: option.color || undefined,
                color: option.color ? '#fff' : undefined,
              }}
              onClick={() => selectOption(option.label)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
