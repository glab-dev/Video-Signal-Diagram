import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NodePreset, NodeData, CustomNodeType } from '../types';
import { savePreset, getPresetsByType, deletePreset } from '../store/db';

interface PresetMenuProps {
  nodeType: CustomNodeType;
  currentData: NodeData;
  currentLabel?: string;
  onLoadPreset: (data: NodeData) => void;
  onRename?: (newLabel: string) => void;
  onReset?: () => void;
  onDelete?: () => void;
}

export default function PresetMenu({ nodeType, currentData, currentLabel, onLoadPreset, onRename, onReset, onDelete }: PresetMenuProps) {
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

  const handleRename = useCallback(() => {
    if (!onRename) return;
    const newName = prompt('Enter new name:', currentLabel || '');
    if (newName !== null && newName.trim() !== '') {
      onRename(newName.trim());
      setIsOpen(false);
    }
  }, [onRename, currentLabel]);

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

  const handleSavePreset = useCallback(async (saveToSidebar: boolean) => {
    const name = prompt('Enter preset name:');
    if (!name) return;

    let category: string | undefined = undefined;

    if (saveToSidebar) {
      // Ask for sidebar category
      const categoryOptions = ['brompton', 'barco', 'blackmagic', 'sources', 'destinations', 'basic'];
      const categoryChoice = prompt(
        `Choose sidebar category:\n\n` +
        categoryOptions.map((c, i) => `${i + 1}. ${c}`).join('\n') +
        '\n\nEnter number or category name:'
      );

      if (!categoryChoice) return; // User cancelled

      const choiceNum = parseInt(categoryChoice);
      if (choiceNum >= 1 && choiceNum <= categoryOptions.length) {
        category = categoryOptions[choiceNum - 1];
      } else if (categoryOptions.includes(categoryChoice.toLowerCase())) {
        category = categoryChoice.toLowerCase();
      } else {
        alert('Invalid category. Please try again.');
        return;
      }
    }

    const preset: NodePreset = {
      id: uuidv4(),
      name,
      nodeType,
      data: currentData,
      category,
      createdAt: Date.now(),
    };

    await savePreset(preset);
    await loadPresets();
    setIsOpen(false);

    // Notify sidebar to refresh
    window.dispatchEvent(new CustomEvent('presetSaved'));

    const msg = saveToSidebar
      ? `Preset "${name}" saved to sidebar (${category})!`
      : `Preset "${name}" saved to this node's menu only!`;
    alert(msg);
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
        // Notify sidebar to refresh
        window.dispatchEvent(new CustomEvent('presetDeleted'));
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
          {onRename && (
            <>
              <button
                className="preset-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRename();
                }}
              >
                ✏️ Rename
              </button>
              <div className="preset-menu-divider"></div>
            </>
          )}
          <div className="preset-menu-section-header">Save Preset</div>
          <button
            className="preset-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              handleSavePreset(false);
            }}
          >
            📋 Save to Node Menu
          </button>
          <button
            className="preset-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              handleSavePreset(true);
            }}
          >
            📁 Save to Sidebar
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

          {onDelete && (
            <>
              <div className="preset-menu-divider"></div>
              <button
                className="preset-menu-item preset-delete-item"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this node?')) {
                    onDelete();
                    setIsOpen(false);
                  }
                }}
              >
                🗑️ Delete Node
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
