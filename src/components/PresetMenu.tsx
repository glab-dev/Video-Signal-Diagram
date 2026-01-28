import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NodePreset, NodeData, CustomNodeType } from '../types';
import { savePreset, getPresetsByType, deletePreset } from '../store/db';

interface PresetMenuProps {
  nodeType: CustomNodeType;
  currentData: NodeData;
  onLoadPreset: (data: NodeData) => void;
  onReset?: () => void;
}

export default function PresetMenu({ nodeType, currentData, onLoadPreset, onReset }: PresetMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<NodePreset[]>([]);
  const [_showPresetList, setShowPresetList] = useState(false);
  const [_showDeleteList, setShowDeleteList] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleReset = useCallback(() => {
    if (onReset && confirm('Reset node to default configuration?')) {
      onReset();
      setIsOpen(false);
    }
  }, [onReset]);

  const loadPresets = useCallback(async () => {
    const loadedPresets = await getPresetsByType(nodeType);
    setPresets(loadedPresets);
  }, [nodeType]);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen, loadPresets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPresetList(false);
        setShowDeleteList(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSavePreset = useCallback(async () => {
    const name = prompt('Enter preset name:');
    if (!name) return;

    const preset: NodePreset = {
      id: uuidv4(),
      name,
      nodeType,
      data: currentData,
      createdAt: Date.now(),
    };

    await savePreset(preset);
    await loadPresets();
    setIsOpen(false);
    alert(`Preset "${name}" saved successfully!`);
  }, [nodeType, currentData, loadPresets]);

  const handleLoadPreset = useCallback(
    (preset: NodePreset) => {
      onLoadPreset(preset.data);
      setIsOpen(false);
      setShowPresetList(false);
    },
    [onLoadPreset]
  );

  const handleDeletePreset = useCallback(
    async (preset: NodePreset) => {
      if (confirm(`Delete preset "${preset.name}"?`)) {
        await deletePreset(preset.id);
        await loadPresets();
      }
    },
    [loadPresets]
  );

  return (
    <div className="preset-menu-container nodrag" ref={menuRef}>
      <button
        className="preset-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setShowPresetList(false);
          setShowDeleteList(false);
        }}
        title="Preset Menu"
      >
        ⚙
      </button>

      {isOpen && (
        <div className="preset-dropdown">
          <button
            className="preset-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              handleSavePreset();
            }}
          >
            💾 Save as Preset
          </button>

          {presets.length > 0 && (
            <>
              <div className="preset-menu-section-header">Load Preset ({presets.length})</div>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-menu-item preset-load-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadPreset(preset);
                  }}
                >
                  📋 {preset.name}
                </button>
              ))}

              <div className="preset-menu-divider"></div>
              <div className="preset-menu-section-header">Delete Preset</div>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-menu-item preset-delete-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreset(preset);
                  }}
                >
                  🗑️ {preset.name}
                </button>
              ))}
            </>
          )}

          {presets.length === 0 && (
            <div className="preset-menu-empty">No saved presets</div>
          )}

          {onReset && (
            <>
              <div className="preset-menu-divider"></div>
              <button
                className="preset-menu-item reset-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
              >
                🔄 Reset to Default
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
