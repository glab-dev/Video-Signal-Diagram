import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { CardNodeData, CardConnector, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';

type CardNodeProps = NodeProps & {
  data: CardNodeData;
};

function CardNode({ id, data, selected, width, height }: CardNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();

  // Get sources with colors
  const sourcesWithColors = useMemo(() => {
    const sources = nodeSummaries
      .filter(n => n.id !== id && (n.hasOutputs || n.hasOutputConnectors) && n.label)
      .map(n => ({ label: n.label, color: n.color }));
    const unique = sources.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id]);

  const sourceNames = useMemo(() => sourcesWithColors.map(s => s.label), [sourcesWithColors]);

  // Get destinations with colors
  const destinationsWithColors = useMemo(() => {
    const dests = nodeSummaries
      .filter(n => n.id !== id && (n.hasInputs || n.hasInputConnectors) && n.label)
      .map(n => ({ label: n.label, color: n.color }));
    const unique = dests.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id]);

  const destinationNames = useMemo(() => destinationsWithColors.map(d => d.label), [destinationsWithColors]);

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
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
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Card Name"
        />
        <PresetMenu
          nodeType="card"
          currentData={data}
          onLoadPreset={handleLoadPreset}
        />
        <button
          className="layout-toggle-btn"
          onClick={toggleCardType}
          title={`Switch to ${data.cardType === 'input' ? 'output' : 'input'} card`}
        >
          {data.cardType === 'input' ? '→' : '←'}
        </button>
      </div>

      <div className="card-content">
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
                  <select
                    value={sourceNames.includes(connector.source || '') ? connector.source : (connector.source ? connector.source : '')}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        const customName = prompt('Enter custom source name:');
                        if (customName) {
                          updateConnector(connector.id, 'source', customName);
                        }
                      } else {
                        updateConnector(connector.id, 'source', e.target.value);
                      }
                    }}
                    className="card-field source"
                    style={{
                      backgroundColor: sourcesWithColors.find(s => s.label === connector.source)?.color || undefined,
                      color: sourcesWithColors.find(s => s.label === connector.source)?.color ? '#fff' : undefined,
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>Select Source</option>
                    {connector.source && !sourceNames.includes(connector.source) && (
                      <option value={connector.source} style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{connector.source}</option>
                    )}
                    {sourcesWithColors.map((source) => (
                      <option key={source.label} value={source.label} style={{ backgroundColor: source.color || '#2a2a2a', color: '#fff' }}>{source.label}</option>
                    ))}
                    <option value="__custom__" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>Custom...</option>
                  </select>
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
                  <select
                    value={destinationNames.includes(connector.destination || '') ? connector.destination : (connector.destination ? connector.destination : '')}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        const customName = prompt('Enter custom destination name:');
                        if (customName) {
                          updateConnector(connector.id, 'destination', customName);
                        }
                      } else {
                        updateConnector(connector.id, 'destination', e.target.value);
                      }
                    }}
                    className="card-field destination"
                    style={{
                      backgroundColor: destinationsWithColors.find(d => d.label === connector.destination)?.color || undefined,
                      color: destinationsWithColors.find(d => d.label === connector.destination)?.color ? '#fff' : undefined,
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>Select Destination</option>
                    {connector.destination && !destinationNames.includes(connector.destination) && (
                      <option value={connector.destination} style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{connector.destination}</option>
                    )}
                    {destinationsWithColors.map((dest) => (
                      <option key={dest.label} value={dest.label} style={{ backgroundColor: dest.color || '#2a2a2a', color: '#fff' }}>{dest.label}</option>
                    ))}
                    <option value="__custom__" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>Custom...</option>
                  </select>
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
