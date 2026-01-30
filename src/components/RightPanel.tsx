import { useState, useEffect, useCallback } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { PaperSize, Orientation, GearConfig } from '../types';
import { PAPER_SIZES } from '../types';
import { getNewChangelog, markVersionSeen } from '../changelog';
import { GearBuilder } from './GearBuilder';
import ProjectTallySection from './ProjectTallySection';
import PermanentSourcesSection from './PermanentSourcesSection';

interface RightPanelProps {
  paperSize: PaperSize;
  orientation: Orientation;
  customWidth: number;
  customHeight: number;
  onPaperSizeChange: (size: PaperSize) => void;
  onOrientationChange: (orientation: Orientation) => void;
  onCustomSizeChange: (width: number, height: number) => void;
  nodes: Node[];
  edges: Edge[];
  projectName?: string;
  onAddGearNode: (config: GearConfig) => void;
  onSaveGearPreset: (config: GearConfig) => void;
  selectedNodeCount: number;
  onApplyToSelected: (config: GearConfig) => void;
  showRatioOverlay: boolean;
  onToggleRatioOverlay: () => void;
  pageCount: number;
}

type MainSectionId = 'sizing' | 'gearBuilder' | 'permanentSources' | 'projectTally';

const DEFAULT_SECTION_ORDER: MainSectionId[] = ['sizing', 'gearBuilder', 'permanentSources', 'projectTally'];

export default function RightPanel({
  paperSize,
  orientation,
  customWidth,
  customHeight,
  onPaperSizeChange,
  onOrientationChange,
  onCustomSizeChange,
  nodes,
  edges,
  projectName,
  onAddGearNode,
  onSaveGearPreset,
  selectedNodeCount,
  onApplyToSelected,
  showRatioOverlay,
  onToggleRatioOverlay,
  pageCount,
}: RightPanelProps) {
  // What's New popup state
  const [whatsNew, setWhatsNew] = useState<{ version: string; entries: { version: string; changes: string[] }[] } | null>(null);

  // Section collapse and order state
  const [sizingExpanded, setSizingExpanded] = useState(true);
  const [sectionOrder, setSectionOrder] = useState<MainSectionId[]>(DEFAULT_SECTION_ORDER);
  const [draggedSection, setDraggedSection] = useState<MainSectionId | null>(null);

  useEffect(() => {
    const changelog = getNewChangelog(__APP_VERSION__);
    if (changelog) {
      setWhatsNew(changelog);
    }
  }, []);

  // Drag and drop handlers for section reordering
  const handleSectionDragStart = useCallback((sectionId: MainSectionId) => {
    setDraggedSection(sectionId);
  }, []);

  const handleSectionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleSectionDrop = useCallback((targetSectionId: MainSectionId) => {
    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    setSectionOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedSection);

      if (draggedIndex !== -1) {
        newOrder.splice(draggedIndex, 1);
        const newTargetIndex = newOrder.indexOf(targetSectionId);
        newOrder.splice(newTargetIndex, 0, draggedSection);
      }

      return newOrder;
    });

    setDraggedSection(null);
  }, [draggedSection]);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSection(null);
  }, []);

  const handleDismissWhatsNew = () => {
    if (whatsNew) {
      markVersionSeen(whatsNew.version);
    }
    setWhatsNew(null);
  };

  // Get current canvas dimensions
  const getCurrentDimensions = () => {
    let dims = PAPER_SIZES[paperSize];

    if (paperSize === 'Custom') {
      dims = { width: customWidth, height: customHeight };
    }

    if (orientation === 'landscape') {
      return {
        width: Math.max(dims.width, dims.height),
        height: Math.min(dims.width, dims.height),
      };
    }
    return {
      width: Math.min(dims.width, dims.height),
      height: Math.max(dims.width, dims.height),
    };
  };

  const currentDims = getCurrentDimensions();

  // Render the Sizing section content
  const renderSizingContent = () => (
    <div className="sizing-content">
      {/* Paper Size */}
      <div className="sidebar-section">
        <label>Paper Size</label>
        <select
          value={paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
        >
          <option value="Letter">Letter (8.5" × 11")</option>
          <option value="Legal">Legal (8.5" × 14")</option>
          <option value="Tabloid">Tabloid (11" × 17")</option>
          <option value="A4">A4 (210mm × 297mm)</option>
          <option value="A3">A3 (297mm × 420mm)</option>
          <option value="A2">A2 (420mm × 594mm)</option>
          <option value="Custom">Custom</option>
        </select>

        {paperSize === 'Custom' && (
          <div style={{ marginTop: '12px' }}>
            <label>Width (px)</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) =>
                onCustomSizeChange(parseInt(e.target.value) || 1200, customHeight)
              }
              min="100"
              max="10000"
            />
            <label style={{ marginTop: '8px' }}>Height (px)</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) =>
                onCustomSizeChange(customWidth, parseInt(e.target.value) || 1200)
              }
              min="100"
              max="20000"
            />
          </div>
        )}
      </div>

      {/* Orientation */}
      <div className="sidebar-section">
        <label>Orientation</label>
        <div className="orientation-toggle">
          <button
            className={`orientation-btn ${orientation === 'portrait' ? 'active' : ''}`}
            onClick={() => onOrientationChange('portrait')}
          >
            Portrait
          </button>
          <button
            className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
            onClick={() => onOrientationChange('landscape')}
          >
            Landscape
          </button>
        </div>
      </div>

      {/* Canvas Dimensions */}
      <div className="sidebar-section">
        <label>Canvas Dimensions</label>
        <div className="canvas-dimensions">
          <div>{currentDims.width} × {currentDims.height} px</div>
        </div>
      </div>

      {/* Paper Ratio Overlay Toggle */}
      <div className="sidebar-section">
        <label>Paper Ratio Overlay</label>
        <button
          className={`ratio-overlay-btn ${showRatioOverlay ? 'active' : ''}`}
          onClick={onToggleRatioOverlay}
        >
          {showRatioOverlay ? 'Hide' : 'Show'} Paper Outline ({pageCount} {pageCount === 1 ? 'sheet' : 'sheets'})
        </button>
      </div>
    </div>
  );

  // Render main section by ID
  const renderSection = (sectionId: MainSectionId) => {
    const isDragging = draggedSection === sectionId;

    switch (sectionId) {
      case 'sizing':
        return (
          <div
            key={sectionId}
            className={`sidebar-section-wrapper sizing-section ${isDragging ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleSectionDragStart(sectionId)}
            onDragOver={handleSectionDragOver}
            onDrop={() => handleSectionDrop(sectionId)}
            onDragEnd={handleSectionDragEnd}
          >
            <div
              className="category-header"
              onClick={() => setSizingExpanded(!sizingExpanded)}
            >
              <span className="section-drag-handle" onMouseDown={(e) => e.stopPropagation()}>⋮⋮</span>
              <span>{sizingExpanded ? '▼' : '▶'} Sizing</span>
            </div>
            {sizingExpanded && renderSizingContent()}
          </div>
        );

      case 'gearBuilder':
        return (
          <div
            key={sectionId}
            className={`sidebar-section-wrapper ${isDragging ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleSectionDragStart(sectionId)}
            onDragOver={handleSectionDragOver}
            onDrop={() => handleSectionDrop(sectionId)}
            onDragEnd={handleSectionDragEnd}
          >
            <div className="section-drag-handle">⋮⋮</div>
            <GearBuilder
              onAddToCanvas={onAddGearNode}
              onSavePreset={onSaveGearPreset}
              selectedNodeCount={selectedNodeCount}
              onApplyToSelected={onApplyToSelected}
            />
          </div>
        );

      case 'permanentSources':
        return (
          <div
            key={sectionId}
            className={`sidebar-section-wrapper ${isDragging ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleSectionDragStart(sectionId)}
            onDragOver={handleSectionDragOver}
            onDrop={() => handleSectionDrop(sectionId)}
            onDragEnd={handleSectionDragEnd}
          >
            <div className="section-drag-handle">⋮⋮</div>
            <PermanentSourcesSection />
          </div>
        );

      case 'projectTally':
        return (
          <div
            key={sectionId}
            className={`sidebar-section-wrapper ${isDragging ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleSectionDragStart(sectionId)}
            onDragOver={handleSectionDragOver}
            onDrop={() => handleSectionDrop(sectionId)}
            onDragEnd={handleSectionDragEnd}
          >
            <div className="section-drag-handle">⋮⋮</div>
            <ProjectTallySection nodes={nodes} edges={edges} projectName={projectName} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="right-panel">
      <div className="sidebar-header">
        <h2>Canvas Settings</h2>
      </div>

      {/* What's New Popup */}
      {whatsNew && (
        <div className="whats-new-popup">
          <div className="whats-new-header">
            <span className="whats-new-title">What's New</span>
            <button className="whats-new-close" onClick={handleDismissWhatsNew} title="Close">
              ×
            </button>
          </div>
          {whatsNew.entries.map((entry) => (
            <div key={entry.version} className="whats-new-version">
              <div className="whats-new-version-label">v{entry.version}</div>
              <ul className="whats-new-list">
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Reorderable Main Sections */}
      {sectionOrder.map(renderSection)}
    </div>
  );
}
