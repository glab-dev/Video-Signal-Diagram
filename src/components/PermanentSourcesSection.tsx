import { useState, useCallback } from 'react';
import type { DragEvent } from 'react';
import { usePermanentSources } from '../hooks/usePermanentSources';

const NODE_COLORS = [
  '#ff0000', // Red
  '#00ff00', // Green
  '#0088cc', // Blue
  '#ff6600', // Orange
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ffff00', // Yellow
  '#8800ff', // Purple
];

type CategoryType = 'source' | 'destination';

interface DroppedNodeInfo {
  label: string;
  color: string;
}

export default function PermanentSourcesSection() {
  const { sources, addSource, removeSource, loading } = usePermanentSources();
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingNode, setPendingNode] = useState<DroppedNodeInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('source');

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Try to get node data from the drag event
    const nodeDataStr = e.dataTransfer.getData('application/reactflow-node');
    if (nodeDataStr) {
      try {
        const nodeData = JSON.parse(nodeDataStr);
        if (nodeData.label) {
          setPendingNode({
            label: nodeData.label,
            color: nodeData.color || NODE_COLORS[0],
          });
          setSelectedCategory('source'); // Default to source
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const handleConfirmCategory = useCallback(async () => {
    if (pendingNode) {
      await addSource(pendingNode.label, pendingNode.color, selectedCategory);
      setPendingNode(null);
    }
  }, [pendingNode, selectedCategory, addSource]);

  const handleCancelCategory = useCallback(() => {
    setPendingNode(null);
  }, []);

  const handleRemoveSource = useCallback(async (id: string) => {
    if (confirm('Remove this override?')) {
      await removeSource(id);
    }
  }, [removeSource]);

  // Group sources by category
  const sourceOverrides = sources.filter(s => s.category === 'source');
  const destinationOverrides = sources.filter(s => s.category === 'destination');

  if (loading) {
    return (
      <div className="permanent-sources-section">
        <div className="category-header">
          <span>Category Overrides</span>
        </div>
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="permanent-sources-section">
      <div
        className="category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? '▼' : '▶'} Category Overrides ({sources.length})</span>
      </div>

      {expanded && (
        <div className="permanent-sources-content">
          <p className="section-description">
            Drag nodes here to override their source/destination category.
          </p>

          {/* Drop Zone */}
          <div
            className={`node-drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="drop-zone-text">
              {isDragOver ? 'Drop node here' : 'Drag a node here'}
            </span>
          </div>

          {/* Category Selection Dialog */}
          {pendingNode && (
            <div className="category-select-dialog">
              <div className="dialog-header">
                <span
                  className="source-color-indicator"
                  style={{ backgroundColor: pendingNode.color }}
                />
                <span className="dialog-node-name">{pendingNode.label}</span>
              </div>
              <div className="dialog-question">Categorize as:</div>
              <div className="category-options">
                <label className={`category-option ${selectedCategory === 'source' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="category"
                    value="source"
                    checked={selectedCategory === 'source'}
                    onChange={() => setSelectedCategory('source')}
                  />
                  <span>Source</span>
                </label>
                <label className={`category-option ${selectedCategory === 'destination' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="category"
                    value="destination"
                    checked={selectedCategory === 'destination'}
                    onChange={() => setSelectedCategory('destination')}
                  />
                  <span>Destination</span>
                </label>
              </div>
              <div className="dialog-actions">
                <button className="dialog-confirm" onClick={handleConfirmCategory}>
                  Save Override
                </button>
                <button className="dialog-cancel" onClick={handleCancelCategory}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Sources List */}
          {sourceOverrides.length > 0 && (
            <div className="overrides-group">
              <div className="overrides-group-header">Sources</div>
              <div className="permanent-sources-list">
                {sourceOverrides.map(source => (
                  <div key={source.id} className="permanent-source-item">
                    <span
                      className="source-color-indicator"
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="source-name">{source.name}</span>
                    <button
                      className="remove-source-btn"
                      onClick={() => handleRemoveSource(source.id)}
                      title="Remove override"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destinations List */}
          {destinationOverrides.length > 0 && (
            <div className="overrides-group">
              <div className="overrides-group-header">Destinations</div>
              <div className="permanent-sources-list">
                {destinationOverrides.map(dest => (
                  <div key={dest.id} className="permanent-source-item">
                    <span
                      className="source-color-indicator"
                      style={{ backgroundColor: dest.color }}
                    />
                    <span className="source-name">{dest.name}</span>
                    <button
                      className="remove-source-btn"
                      onClick={() => handleRemoveSource(dest.id)}
                      title="Remove override"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
