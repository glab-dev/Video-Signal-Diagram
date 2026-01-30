import { useState, useCallback } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { useProjectTally, formatProjectTallyText } from '../hooks/useProjectTally';

interface ProjectTallySectionProps {
  nodes: Node[];
  edges: Edge[];
  projectName?: string;
}

export default function ProjectTallySection({ nodes, edges, projectName }: ProjectTallySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([
    'sources', 'processors', 'switchers', 'converters', 'destinations', 'cards', 'notes', 'images', 'other'
  ]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  const tally = useProjectTally(nodes, edges, categoryOrder);

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleCopyToClipboard = useCallback(() => {
    const text = formatProjectTallyText(tally, projectName);
    navigator.clipboard.writeText(text);
  }, [tally, projectName]);

  const handleSendToJared = useCallback(() => {
    const text = formatProjectTallyText(tally, projectName);
    const subject = encodeURIComponent(`Project Tally${projectName ? `: ${projectName}` : ''}`);
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [tally, projectName]);

  // Drag and drop handlers for category reordering
  const handleDragStart = useCallback((categoryId: string) => {
    setDraggedCategory(categoryId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetCategoryId: string) => {
    if (!draggedCategory || draggedCategory === targetCategoryId) {
      setDraggedCategory(null);
      return;
    }

    setCategoryOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedCategory);
      const targetIndex = newOrder.indexOf(targetCategoryId);

      if (draggedIndex === -1) {
        // Add dragged category if not in order
        newOrder.splice(targetIndex, 0, draggedCategory);
      } else {
        // Move dragged category
        newOrder.splice(draggedIndex, 1);
        const newTargetIndex = newOrder.indexOf(targetCategoryId);
        newOrder.splice(newTargetIndex, 0, draggedCategory);
      }

      return newOrder;
    });

    setDraggedCategory(null);
  }, [draggedCategory]);

  const handleDragEnd = useCallback(() => {
    setDraggedCategory(null);
  }, []);

  return (
    <div className="project-tally-section">
      <div
        className="category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? '▼' : '▶'} Project Tally</span>
      </div>

      {expanded && (
        <div className="project-tally-content">
          {/* Equipment Categories */}
          {tally.categories.map(category => {
            const isCollapsed = collapsedCategories.has(category.id);
            return (
              <div
                key={category.id}
                className={`project-tally-category ${draggedCategory === category.id ? 'dragging' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                draggable
                onDragStart={() => handleDragStart(category.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(category.id)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="project-tally-category-header"
                  onClick={() => toggleCategory(category.id)}
                >
                  <span className="drag-handle" onMouseDown={(e) => e.stopPropagation()}>⋮⋮</span>
                  <span className="collapse-indicator">{isCollapsed ? '▶' : '▼'}</span>
                  <span className="category-name">{category.label}</span>
                  <span className="category-count">{category.items.length}</span>
                </div>
                {!isCollapsed && (
                  <ul className="project-tally-items">
                    {category.items.map(item => (
                      <li key={item.id} className="project-tally-item">
                        <span className="item-name">{item.name}</span>
                        {item.details && <span className="item-details">{item.details}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Cables Section */}
          {tally.cables.length > 0 && (() => {
            const isCablesCollapsed = collapsedCategories.has('cables');
            return (
              <div className={`project-tally-category cables ${isCablesCollapsed ? 'collapsed' : ''}`}>
                <div
                  className="project-tally-category-header"
                  onClick={() => toggleCategory('cables')}
                >
                  <span className="drag-handle" style={{ visibility: 'hidden' }}>⋮⋮</span>
                  <span className="collapse-indicator">{isCablesCollapsed ? '▶' : '▼'}</span>
                  <span className="category-name">Cables</span>
                  <span className="category-count">{tally.totalCables}</span>
                </div>
                {!isCablesCollapsed && (
                  <ul className="project-tally-items">
                    {tally.cables.map(cable => (
                      <li key={cable.id} className="project-tally-item cable-item">
                        <span className="item-name">{cable.cableType}</span>
                        <span className="cable-length">{cable.cableLength}</span>
                        <span className="cable-count">×{cable.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}

          {/* Empty state */}
          {tally.categories.length === 0 && tally.cables.length === 0 && (
            <div className="project-tally-empty">
              No equipment in project yet.
            </div>
          )}

          {/* Summary and Actions */}
          <div className="project-tally-footer">
            <div className="project-tally-summary">
              <span>Equipment: {tally.totalNodes}</span>
              <span>Cables: {tally.totalCables}</span>
            </div>
            <div className="project-tally-actions">
              <button
                className="tally-btn copy"
                onClick={handleCopyToClipboard}
                title="Copy to clipboard"
              >
                Copy
              </button>
              <button
                className="tally-btn email"
                onClick={handleSendToJared}
                title="Send via email"
              >
                Send to Jared
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
