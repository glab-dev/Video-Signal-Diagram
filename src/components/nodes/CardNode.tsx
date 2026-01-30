import { memo, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { CardNodeData, CardConnector, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';
import EditableSelect from '../EditableSelect';

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

type CardNodeProps = NodeProps & {
  data: CardNodeData;
};

function CardNode({ id, data, selected, width, height }: CardNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();
  const { sources: permanentSources } = usePermanentSources();

  // Get sources with colors - category overrides + pure source nodes (output-only)
  const sourcesWithColors = useMemo(() => {
    // Start with category overrides marked as 'source'
    const overrides = permanentSources
      .filter(s => s.category === 'source')
      .map(s => ({ label: s.name, color: s.color }));

    // Skip nodes with destination override
    const destinationOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'destination').map(s => s.name)
    );

    // Add dynamic sources from nodes
    const dynamic = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        // Skip if has destination override
        if (destinationOverrideNames.has(n.label)) return false;
        // Pure sources: nodes that output signals but don't receive them
        const isPureSource =
          // GenericIO with outputs only
          (n.hasOutputs && !n.hasInputs && !n.hasRows) ||
          // Card configured as output type
          (n.hasOutputConnectors && !n.hasInputConnectors) ||
          // BarcoE3 with only output cards
          (n.hasOutputCards && !n.hasInputCards);
        return isPureSource;
      })
      .map(n => ({ label: n.label, color: n.color }));

    // Merge and deduplicate (overrides take precedence)
    const all = [...overrides, ...dynamic];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

  // Get destinations with colors - category overrides + pure destination nodes (input-only)
  const destinationsWithColors = useMemo(() => {
    // Start with category overrides marked as 'destination'
    const overrides = permanentSources
      .filter(s => s.category === 'destination')
      .map(s => ({ label: s.name, color: s.color }));

    // Skip nodes with source override
    const sourceOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'source').map(s => s.name)
    );

    const dests = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        // Skip if has source override
        if (sourceOverrideNames.has(n.label)) return false;
        // Pure destinations: nodes that receive signals but don't output them
        const isPureDestination =
          // GenericIO with inputs only
          (n.hasInputs && !n.hasOutputs && !n.hasRows) ||
          // Card configured as input type
          (n.hasInputConnectors && !n.hasOutputConnectors) ||
          // BarcoE3 with only input cards
          (n.hasInputCards && !n.hasOutputCards) ||
          // LEDWall is always a destination
          n.type === 'ledWall';
        return isPureDestination;
      })
      .map(n => ({ label: n.label, color: n.color }));

    // Merge and deduplicate
    const all = [...overrides, ...dests];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  const updateColor = useCallback(
    (color: string) => {
      updateNodeData(id, { color });
    },
    [id, updateNodeData]
  );

  const toggleCardType = useCallback(() => {
    const newType = data.cardType === 'input' ? 'output' : 'input';
    updateNodeData(id, { cardType: newType });
  }, [id, data.cardType, updateNodeData]);

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      const cardData = presetData as CardNodeData;
      updateNodeData(id, {
        label: cardData.label,
        color: cardData.color,
        cardType: cardData.cardType,
        connectors: cardData.connectors
      });
    },
    [id, updateNodeData]
  );

  const updateConnector = useCallback(
    (connectorId: string, field: keyof CardConnector, value: string) => {
      const newConnectors = data.connectors.map((conn) =>
        conn.id === connectorId ? { ...conn, [field]: value } : conn
      );
      updateNodeData(id, { connectors: newConnectors });
    },
    [id, data.connectors, updateNodeData]
  );

  const addConnector = useCallback(() => {
    const newConnector: CardConnector = {
      id: uuidv4(),
      type: 'HDMI 2.0',
      source: data.cardType === 'input' ? '' : undefined,
      resolution: '3840x2160@60',
      destination: data.cardType === 'output' ? '' : undefined,
    };
    updateNodeData(id, { connectors: [...data.connectors, newConnector] });
  }, [id, data.connectors, data.cardType, updateNodeData]);

  const removeConnector = useCallback(
    (connectorId: string) => {
      updateNodeData(id, { connectors: data.connectors.filter((c) => c.id !== connectorId) });
    },
    [id, data.connectors, updateNodeData]
  );

  const handlePosition = data.cardType === 'input' ? Position.Left : Position.Right;
  const handleType = data.cardType === 'input' ? 'target' : 'source';
  const nodeWidth = width || undefined;
  const nodeHeight = height || undefined;
  const { contentRef, scaleStyle } = useNodeScale(nodeWidth, nodeHeight);
  const nodeColor = data.color || (data.cardType === 'input' ? '#4a9eff' : '#50e3c2');

  // Handle drag start for category override drop zone
  const handleCategoryDragStart = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/reactflow-node', JSON.stringify({
      label: data.label,
      color: nodeColor,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [data.label, nodeColor]);

  return (
    <div
      className={`node-card ${selected ? 'selected' : ''} ${data.cardType === 'input' ? 'card-input' : 'card-output'}`}
      style={{
        borderColor: data.color || (data.cardType === 'input' ? '#4a9eff' : '#50e3c2'),
        width: nodeWidth,
        height: nodeHeight,
      }}
    >
      <NodeResizer
        minWidth={280}
        minHeight={150}
        maxWidth={500}
        keepAspectRatio
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div ref={contentRef} style={scaleStyle}>
      <div className="node-header" style={{ backgroundColor: data.color || (data.cardType === 'input' ? '#4a9eff' : '#50e3c2') }}>
        <EditableTitle value={data.label} placeholder="Card Name" onChange={updateLabel} className="node-title light" />
        <PresetMenu
          nodeType="card"
          currentData={data}
          currentLabel={data.label}
          onLoadPreset={handleLoadPreset}
          onRename={updateLabel}
        />
        <button
          className="layout-toggle-btn"
          onClick={toggleCardType}
          title={`Switch to ${data.cardType === 'input' ? 'output' : 'input'} card`}
        >
          {data.cardType === 'input' ? '→' : '←'}
        </button>
        <button
          className="category-drag-btn nodrag"
          draggable
          onDragStart={handleCategoryDragStart}
          title="Drag to Category Overrides to set as source/destination"
        >
          ⊕
        </button>
      </div>

      <div className="color-picker-row">
        {NODE_COLORS.map((color) => (
          <button
            key={color}
            className={`color-btn ${data.color === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => updateColor(color)}
          />
        ))}
      </div>

      <div className="card-content nodrag">
        <div className="card-header-row">
          {data.cardType === 'input' ? (
            <>
              <span className="card-col-header source">SOURCE</span>
              <span className="card-col-header connector">CONNECTOR</span>
              <span className="card-col-header resolution">RESOLUTION</span>
            </>
          ) : (
            <>
              <span className="card-col-header resolution">RESOLUTION</span>
              <span className="card-col-header connector">CONNECTOR</span>
              <span className="card-col-header destination">DESTINATION</span>
            </>
          )}
        </div>
        <div className="card-connectors">
          {data.connectors.map((connector, index) => (
            <div key={connector.id} className="card-row">
              <Handle
                type={handleType}
                position={handlePosition}
                id={`connector-${connector.id}`}
                className="port-handle"
                style={{ top: `${60 + index * 32}px` }}
              />
              {data.cardType === 'input' ? (
                <>
                  <EditableSelect
                    value={connector.source || ''}
                    options={sourcesWithColors}
                    onChange={(value) => updateConnector(connector.id, 'source', value)}
                    placeholder="Select Source"
                    className="card-field source"
                  />
                  <select
                    value={connector.type}
                    onChange={(e) => updateConnector(connector.id, 'type', e.target.value as any)}
                    className="card-field connector"
                  >
                    <option value="DP 1.2">DP 1.2</option>
                    <option value="HDMI 2.0">HDMI 2.0</option>
                    <option value="12G SDI">12G SDI</option>
                  </select>
                  <input
                    value={connector.resolution || ''}
                    onChange={(e) => updateConnector(connector.id, 'resolution', e.target.value)}
                    className="card-field resolution"
                    placeholder="Resolution"
                  />
                </>
              ) : (
                <>
                  <input
                    value={connector.resolution || ''}
                    onChange={(e) => updateConnector(connector.id, 'resolution', e.target.value)}
                    className="card-field resolution"
                    placeholder="Resolution"
                  />
                  <select
                    value={connector.type}
                    onChange={(e) => updateConnector(connector.id, 'type', e.target.value as any)}
                    className="card-field connector"
                  >
                    <option value="DP 1.2">DP 1.2</option>
                    <option value="HDMI 2.0">HDMI 2.0</option>
                    <option value="12G SDI">12G SDI</option>
                  </select>
                  <EditableSelect
                    value={connector.destination || ''}
                    options={destinationsWithColors}
                    onChange={(value) => updateConnector(connector.id, 'destination', value)}
                    placeholder="Select Destination"
                    className="card-field destination"
                  />
                </>
              )}
              <button className="remove-btn" onClick={() => removeConnector(connector.id)}>×</button>
            </div>
          ))}
        </div>
        <button className="add-connector-btn" onClick={addConnector}>+ Add Connector</button>
      </div>
      </div>
    </div>
  );
}

export default memo(CardNode);
