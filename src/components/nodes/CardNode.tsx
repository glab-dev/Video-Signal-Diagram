import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { useNodeScale } from '../../hooks/useNodeScale';
import type { CardNodeData, CardConnector, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';
import EditableTitle from '../EditableTitle';
import EditableSelect from '../EditableSelect';

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
