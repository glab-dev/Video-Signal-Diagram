import { useCallback, useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node } from '@xyflow/react';
import type { ProjectData, NodePreset } from '../types';
import { exportProject, importProject, deleteProject, getAllProjects, getAllPresets, deletePreset, savePreset, saveProject, loadProject } from '../store/db';
import { useSidebarCustomization } from '../hooks/useSidebarCustomization';
import { EQUIPMENT_PRESETS } from '../data/nodeCategories';
import type { PresetItem } from '../data/nodeCategories';
import { createNodeFromPreset } from '../utils/createNodeFromPreset';

// Recent files stored in localStorage, project data in IndexedDB
interface RecentFile {
  name: string;
  path: string;
  projectId: string;
  timestamp: number;
}

const RECENTS_KEY = 'vsf-recent-files';
const MAX_RECENTS = 5;

const getRecentFiles = (): RecentFile[] => {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToRecentFiles = (name: string, path: string, projectId: string) => {
  const recents = getRecentFiles();
  // Remove if already exists (by project ID or path)
  const filtered = recents.filter(r => r.projectId !== projectId && r.path !== path);
  // Add to front
  filtered.unshift({ name, path, projectId, timestamp: Date.now() });
  // Keep only MAX_RECENTS
  const trimmed = filtered.slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
  return trimmed;
};

interface SidebarProps {
  onAddNode: (node: Node) => void;
  getViewportCenter: () => { x: number; y: number };
  projectData: ProjectData;
  onLoadProject: (project: ProjectData) => void;
  onNewProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPNG: () => void;
  cascadeDirection: 'right' | 'left';
  onCascadeDirectionChange: (direction: 'right' | 'left') => void;
}


export default function Sidebar({ onAddNode, getViewportCenter, projectData, onLoadProject, onNewProject, onUndo, onRedo, canUndo, canRedo, onExportPNG, cascadeDirection, onCascadeDirectionChange }: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placementCounter = useRef(0);
  const placementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    supernodes: true,
    sources: true,
    switchers: true,
    destinations: true,
    utilities: true,
  });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showRecents, setShowRecents] = useState(false);
  const [savedPresets, setSavedPresets] = useState<NodePreset[]>([]);
  const [moveItemDialog, setMoveItemDialog] = useState<{ categoryKey: string; itemName: string } | null>(null);

  // Sidebar customization (hidden items, moved items)
  const {
    hideCategory,
    isCategoryHidden,
    hideItem,
    isItemHidden,
    moveItem,
    getItemCategory,
    resetToDefaults,
  } = useSidebarCustomization();

  const loadSavedPresets = useCallback(async () => {
    console.log('Loading saved presets...');
    const presets = await getAllPresets();
    console.log('Loaded presets:', presets);
    setSavedPresets(presets);
  }, []);

  // Load recent files and saved presets on mount
  useEffect(() => {
    setRecentFiles(getRecentFiles());
    loadSavedPresets();
  }, []); // Empty dependency array - only run on mount

  // Listen for preset save/delete events
  useEffect(() => {
    const handlePresetChange = () => {
      console.log('Preset change event received');
      loadSavedPresets();
    };

    window.addEventListener('presetSaved', handlePresetChange);
    window.addEventListener('presetDeleted', handlePresetChange);

    return () => {
      window.removeEventListener('presetSaved', handlePresetChange);
      window.removeEventListener('presetDeleted', handlePresetChange);
    };
  }, []); // Empty dependency array - loadSavedPresets is stable

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const addSavedPresetNode = useCallback((preset: NodePreset) => {
    const basePos = getViewportCenter();
    const offset = placementCounter.current * 30;
    const pos = { x: basePos.x + offset, y: basePos.y + offset };
    placementCounter.current += 1;
    if (placementTimer.current) clearTimeout(placementTimer.current);
    placementTimer.current = setTimeout(() => { placementCounter.current = 0; }, 2000);

    const node: Node = {
      id: uuidv4(),
      type: preset.nodeType,
      position: pos,
      data: { ...preset.data },
    };
    onAddNode(node);
  }, [onAddNode, getViewportCenter]);

  const handleDeleteSavedPreset = useCallback(async (presetId: string) => {
    if (confirm('Delete this saved node configuration?')) {
      await deletePreset(presetId);
      await loadSavedPresets();
    }
  }, [loadSavedPresets]);

  // Export all presets to a file for backup
  const handleExportPresets = useCallback(async () => {
    const presets = await getAllPresets();
    if (presets.length === 0) {
      alert('No saved presets to export.');
      return;
    }
    const json = JSON.stringify(presets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presets-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`Exported ${presets.length} presets to file.`);
  }, []);

  // Import presets from a backup file
  const presetInputRef = useRef<HTMLInputElement>(null);
  const handleImportPresets = useCallback(() => {
    presetInputRef.current?.click();
  }, []);

  const handlePresetFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const presets = JSON.parse(e.target?.result as string);
        if (!Array.isArray(presets)) {
          alert('Invalid preset file format.');
          return;
        }
        let imported = 0;
        for (const preset of presets) {
          if (preset.id && preset.name && preset.nodeType && preset.data) {
            await savePreset(preset);
            imported++;
          }
        }
        await loadSavedPresets();
        window.dispatchEvent(new CustomEvent('presetSaved'));
        alert(`Imported ${imported} presets successfully!`);
      } catch {
        alert('Failed to import presets. Invalid file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [loadSavedPresets]);

  const handleDragStart = useCallback((e: React.DragEvent, preset: NodePreset) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'savedPreset',
      preset: preset,
    }));
  }, []);

  const addPresetNode = useCallback((preset: PresetItem) => {
    const basePos = getViewportCenter();
    const offset = placementCounter.current * 30;
    const position = { x: basePos.x + offset, y: basePos.y + offset };
    placementCounter.current += 1;
    if (placementTimer.current) clearTimeout(placementTimer.current);
    placementTimer.current = setTimeout(() => { placementCounter.current = 0; }, 2000);

    onAddNode(createNodeFromPreset(preset, position));
  }, [onAddNode, getViewportCenter]);


  const handleSave = useCallback(() => {
    const filename = prompt('Save As:', projectData.name);
    if (filename) {
      const projectToSave = { ...projectData, name: filename };
      const json = exportProject(projectToSave);
      const blob = new Blob([json], { type: 'application/vsf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const downloadName = `${filename.replace(/\s+/g, '_')}.vsf`;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
      // Save to IndexedDB and update recents
      saveProject(projectToSave);
      const updated = addToRecentFiles(filename, downloadName, projectToSave.id);
      setRecentFiles(updated);
    }
  }, [projectData]);

  // Save to file using File System Access API (works with any location including Google Drive)
  const handleSaveToFile = useCallback(async () => {
    const json = exportProject(projectData);
    const fileName = `${projectData.name.replace(/\s+/g, '_')}.vsf`;

    // Try to use the File System Access API (modern browsers)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Video Signal Flow Project',
            accept: { 'application/vsf': ['.vsf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        // Save to IndexedDB and update recents
        saveProject(projectData);
        const savedName = handle.name;
        const updated = addToRecentFiles(projectData.name, savedName, projectData.id);
        setRecentFiles(updated);
        alert('Project saved successfully!');
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          console.error('Save failed:', err);
          // Fallback to download
          fallbackDownload(json, fileName);
        }
      }
    } else {
      // Fallback for browsers without File System Access API
      fallbackDownload(json, fileName);
      saveProject(projectData);
      const updated = addToRecentFiles(projectData.name, fileName, projectData.id);
      setRecentFiles(updated);
    }
  }, [projectData]);

  const fallbackDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'application/vsf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open file using File System Access API
  const handleOpenFile = useCallback(async () => {
    // Try to use the File System Access API (modern browsers)
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as Window & { showOpenFilePicker: (options: { types: { description: string; accept: Record<string, string[]> }[]; multiple: boolean }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [{
            description: 'Video Signal Flow Project',
            accept: { 'application/vsf': ['.vsf'], 'application/json': ['.json'] },
          }],
          multiple: false,
        });
        const file = await handle.getFile();
        const content = await file.text();
        try {
          const project = importProject(content, file.name);
          onLoadProject(project);
          // Save to IndexedDB and update recents
          saveProject(project);
          const updated = addToRecentFiles(project.name, file.name, project.id);
          setRecentFiles(updated);
        } catch {
          alert('Invalid project file');
        }
      } catch (err) {
        // User cancelled
        if ((err as Error).name !== 'AbortError') {
          console.error('Open failed:', err);
          // Fallback to file input
          fileInputRef.current?.click();
        }
      }
    } else {
      // Fallback for browsers without File System Access API
      fileInputRef.current?.click();
    }
  }, [onLoadProject]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const project = importProject(e.target?.result as string, file.name);
            onLoadProject(project);
            // Save to IndexedDB and update recents
            saveProject(project);
            const updated = addToRecentFiles(project.name, file.name, project.id);
            setRecentFiles(updated);
          } catch {
            alert('Invalid project file');
          }
        };
        reader.readAsText(file);
      }
      event.target.value = '';
    },
    [onLoadProject]
  );

  const handleDeleteProject = useCallback(async () => {
    const projects = await getAllProjects();
    if (projects.length === 0) {
      alert('No saved projects found');
      return;
    }
    const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Select project number to delete:\n${projectList}`);
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < projects.length) {
        if (confirm(`Delete "${projects[index].name}"?`)) {
          await deleteProject(projects[index].id);
          alert('Project deleted');
        }
      }
    }
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Signal Flow</h2>
        <div className="version-number">V{__APP_VERSION__}</div>
      </div>

      {/* Project Actions */}
      <div className="sidebar-section">
        <div className="section-title">Project</div>
        <div className="sidebar-buttons">
          <button onClick={onNewProject} title="New Project">New</button>
          <button onClick={handleOpenFile} title="Open .vsf file">Open</button>
          <button onClick={handleSaveToFile} title="Save as .vsf file">Save As</button>
          <button onClick={handleDeleteProject} title="Delete from browser">Delete</button>
        </div>
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={handleSave} title="Quick save to browser">Quick Save</button>
          <button
            onClick={() => setShowRecents(!showRecents)}
            title="Recently opened files"
            style={{ position: 'relative' }}
          >
            Recents {recentFiles.length > 0 ? `(${recentFiles.length})` : ''}
          </button>
        </div>
        {showRecents && (
          <div className="recents-dropdown">
            {recentFiles.length === 0 ? (
              <div className="recents-empty">No recent files</div>
            ) : (
              recentFiles.map((file, index) => (
                <button
                  key={index}
                  className="recents-item"
                  onClick={async () => {
                    if (file.projectId) {
                      const project = await loadProject(file.projectId);
                      if (project) {
                        onLoadProject(project);
                        setShowRecents(false);
                        return;
                      }
                    }
                    alert(`Project data not found in browser storage. Use the Open button to re-import the file.`);
                    setShowRecents(false);
                  }}
                  title={file.path}
                >
                  <span className="recents-name">{file.name}</span>
                  <span className="recents-date">
                    {new Date(file.timestamp).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
          <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
        </div>
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={onExportPNG} title="Export diagram as PNG image">Export PNG</button>
        </div>
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={handleExportPresets} title="Export saved presets to JSON">Export Presets</button>
          <button onClick={handleImportPresets} title="Import presets from JSON">Import Presets</button>
        </div>
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button
            onClick={() => onCascadeDirectionChange(cascadeDirection === 'right' ? 'left' : 'right')}
            title="Toggle paste cascade direction"
            style={{
              gridColumn: '1 / -1',
              background: cascadeDirection === 'right' ? '#2a4a2a' : '#4a2a2a',
              borderColor: cascadeDirection === 'right' ? '#3a6a3a' : '#6a3a3a'
            }}
          >
            Paste: {cascadeDirection === 'right' ? '→ Right' : '← Left'}
          </button>
        </div>
      </div>

      {/* Node Categories */}
      {Object.entries(EQUIPMENT_PRESETS)
        .filter(([key]) => !isCategoryHidden(key))
        .map(([key, category]) => {
        const categorySavedPresets = savedPresets.filter(p => p.category === key);

        // Get items that belong to this category (original + moved here)
        // Items originally in this category that haven't been moved elsewhere
        const originalItems = category.items
          .filter(item => {
            const effectiveCategory = getItemCategory(key, item.name);
            return effectiveCategory === key && !isItemHidden(key, item.name);
          })
          .map(item => ({ item, originalCategory: key }));

        // Items moved here from other categories
        const movedItems: { item: PresetItem; originalCategory: string }[] = [];
        Object.entries(EQUIPMENT_PRESETS).forEach(([otherKey, otherCategory]) => {
          if (otherKey !== key) {
            otherCategory.items.forEach(item => {
              const effectiveCategory = getItemCategory(otherKey, item.name);
              if (effectiveCategory === key && !isItemHidden(otherKey, item.name)) {
                movedItems.push({ item: item as PresetItem, originalCategory: otherKey });
              }
            });
          }
        });

        const categoryItems = [...originalItems, ...movedItems];

        return (
          <div className="sidebar-section" key={key}>
            <div className="category-header">
              <span onClick={() => toggleCategory(key)}>
                {expandedCategories[key] ? '▼' : '▶'} {category.icon} {category.label}
              </span>
              <button
                className="category-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Hide "${category.label}" category? You can restore it later.`)) {
                    hideCategory(key);
                  }
                }}
                title={`Hide ${category.label} category`}
              >
                ×
              </button>
            </div>
            {expandedCategories[key] && (
              <div className="category-items">
                {categoryItems.map(({ item, originalCategory }, index) => (
                  <div key={`${originalCategory}-${item.name}-${index}`} className="sidebar-item-row">
                    <button
                      className="node-btn"
                      onClick={() => addPresetNode(item)}
                    >
                      <span className="node-icon" style={{ background: item.color }}></span>
                      {item.name}
                      {originalCategory !== key && <span className="moved-indicator" title={`Moved from ${EQUIPMENT_PRESETS[originalCategory as keyof typeof EQUIPMENT_PRESETS]?.label}`}>↵</span>}
                    </button>
                    <button
                      className="item-move-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveItemDialog({ categoryKey: originalCategory, itemName: item.name });
                      }}
                      title="Move to another category"
                    >
                      ⇄
                    </button>
                    <button
                      className="item-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hide "${item.name}"? You can restore it later.`)) {
                          hideItem(originalCategory, item.name);
                        }
                      }}
                      title="Hide this item"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {categorySavedPresets.length > 0 && (
                  <>
                    <div className="saved-presets-divider">Saved Configs</div>
                    {categorySavedPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="saved-preset-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, preset)}
                      >
                        <button
                          className="node-btn"
                          onClick={() => addSavedPresetNode(preset)}
                        >
                          <span className="node-icon" style={{ background: (preset.data as { color?: string }).color || '#666' }}></span>
                          {preset.name}
                        </button>
                        <button
                          className="delete-preset-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSavedPreset(preset.id);
                          }}
                          title="Delete saved config"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Move Item Dialog */}
      {moveItemDialog && (
        <div className="move-item-dialog-overlay" onClick={() => setMoveItemDialog(null)}>
          <div className="move-item-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="move-item-dialog-header">
              Move "{moveItemDialog.itemName}" to:
            </div>
            <div className="move-item-dialog-options">
              {Object.entries(EQUIPMENT_PRESETS).map(([catKey, cat]) => (
                <button
                  key={catKey}
                  className={`move-item-option ${catKey === getItemCategory(moveItemDialog.categoryKey, moveItemDialog.itemName) ? 'current' : ''}`}
                  onClick={() => {
                    moveItem(moveItemDialog.categoryKey, moveItemDialog.itemName, catKey);
                    setMoveItemDialog(null);
                  }}
                >
                  {cat.icon} {cat.label}
                  {catKey === moveItemDialog.categoryKey && ' (original)'}
                </button>
              ))}
            </div>
            <button className="move-item-dialog-cancel" onClick={() => setMoveItemDialog(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Restore Defaults Button */}
      <div className="sidebar-section restore-section">
        <button
          className="restore-defaults-btn"
          onClick={() => {
            if (confirm('Restore all hidden categories and items? This will undo all customizations.')) {
              resetToDefaults();
            }
          }}
          title="Restore all hidden categories and items"
        >
          Restore Hidden Items
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".vsf,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={presetInputRef}
        type="file"
        accept=".json"
        onChange={handlePresetFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
