import { memo, useCallback, useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useHandlePositions } from '../../hooks/useHandlePositions';
import type { CardNodeData, CardConnector, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import NodeShell from './NodeShell';
import EditableSelect from '../EditableSelect';

type CardNodeProps = NodeProps & {
  data: CardNodeData;
};

function CardNode({ id, data, selected, width, height }: CardNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeSummaries = useNodeSummariesContext();
  const { sources: permanentSources } = usePermanentSources();

  // Get sources with colors
  const sourcesWithColors = useMemo(() => {
    const overrides = permanentSources
      .filter(s => s.category === 'source')
      .map(s => ({ label: s.name, color: s.color }));

    const destinationOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'destination').map(s => s.name)
    );

    const dynamic = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        if (destinationOverrideNames.has(n.label)) return false;
        const isPureSource =
          (n.hasOutputs && !n.hasInputs && !n.hasRows) ||
          (n.hasOutputConnectors && !n.hasInputConnectors) ||
          (n.hasOutputCards && !n.hasInputCards);
        return isPureSource;
      })
      .map(n => ({ label: n.label, color: n.color }));

    const all = [...overrides, ...dynamic];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

  // Get destinations with colors
  const destinationsWithColors = useMemo(() => {
    const overrides = permanentSources
      .filter(s => s.category === 'destination')
      .map(s => ({ label: s.name, color: s.color }));

    const sourceOverrideNames = new Set(
      permanentSources.filter(s => s.category === 'source').map(s => s.name)
    );

    const dests = nodeSummaries
      .filter(n => {
        if (n.id === id || !n.label) return false;
        if (sourceOverrideNames.has(n.label)) return false;
        const isPureDestination =
          (n.hasInputs && !n.hasOutputs && !n.hasRows) ||
          (n.hasInputConnectors && !n.hasOutputConnectors) ||
          (n.hasInputCards && !n.hasOutputCards) ||
          n.type === 'ledWall';
        return isPureDestination;
      })
      .map(n => ({ label: n.label, color: n.color }));

    const all = [...overrides, ...dests];
    const unique = all.filter((v, i, a) => a.findIndex(s => s.label === v.label) === i);
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, [nodeSummaries, id, permanentSources]);

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

  const connectors = data.connectors || [];

  const updateConnector = useCallback(
    (connectorId: string, field: keyof CardConnector, value: string) => {
      const newConnectors = connectors.map((conn) =>
        conn.id === connectorId ? { ...conn, [field]: value } : conn
      );
      updateNodeData(id, { connectors: newConnectors });
    },
    [id, connectors, updateNodeData]
  );

  const addConnector = useCallback(() => {
    const newConnector: CardConnector = {
      id: uuidv4(),
      type: 'HDMI 2.0',
      source: data.cardType === 'input' ? '' : undefined,
      resolution: '3840x2160@60',
      destination: data.cardType === 'output' ? '' : undefined,
    };
    updateNodeData(id, { connectors: [...connectors, newConnector] });
  }, [id, connectors, data.cardType, updateNodeData]);

  const removeConnector = useCallback(
    (connectorId: string) => {
      updateNodeData(id, { connectors: connectors.filter((c) => c.id !== connectorId) });
    },
    [id, connectors, updateNodeData]
  );

  const handlePosition = data.cardType === 'input' ? Position.Left : Position.Right;
  const handleType = data.cardType === 'input' ? 'target' : 'source';
  const defaultColor = data.cardType === 'input' ? '#4a9eff' : '#50e3c2';
  const nodeColor = data.color || defaultColor;

  const handleCategoryDragStart = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/reactflow-node', JSON.stringify({
      label: data.label,
      color: nodeColor,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [data.label, nodeColor]);

  // DOM-measured handle positioning
  const nodeRef = useRef<HTMLDivElement>(null);
  const { rowRef, positions: handlePositions } = useHandlePositions(
    nodeRef,
    [connectors, data.cardType, width, height]
  );

  // Build handles outside contentRef
  const handles = (
    <>
      {connectors.map((connector) => (
        <Handle
          key={`connector-${connector.id}`}
          type={handleType}
          position={handlePosition}
          id={`connector-${connector.id}`}
          className="port-handle"
          style={{ top: handlePositions[`connector-${connector.id}`] ?? 0 }}
        />
      ))}
    </>
  );

  return (
    <NodeShell
      id={id}
      selected={selected}
      width={width}
      height={height}
      nodeType="card"
      nodeClassName="node-card"
      defaultColor={defaultColor}
      data={data}
      minWidth={280}
      minHeight={150}
      maxWidth={500}
      placeholder="Card Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      extraClassName={data.cardType === 'input' ? 'card-input' : 'card-output'}
      nodeRef={nodeRef}
      outsideHandles={handles}
      headerButtons={
        <>
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
        </>
      }
    >
      {/* Connectors Table */}
      <div className="io-table-section">
        <div className="io-table-header">
          <span>{data.cardType === 'input' ? 'INPUT' : 'OUTPUT'}</span>
          <button className="add-btn" onClick={addConnector}>+</button>
        </div>
        <table className="io-table nodrag">
          <thead>
            <tr>
              {data.cardType === 'input' ? (
                <>
                  <th className="col-source">SOURCE</th>
                  <th className="col-connection">CONNECTOR</th>
                  <th className="col-resolution">RESOLUTION</th>
                </>
              ) : (
                <>
                  <th className="col-resolution">RESOLUTION</th>
                  <th className="col-connection">CONNECTOR</th>
                  <th className="col-destination">DESTINATION</th>
                </>
              )}
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {connectors.map((connector) => (
              <tr key={connector.id} ref={rowRef(`connector-${connector.id}`)} className="port-table-row">
                {data.cardType === 'input' ? (
                  <>
                    <td className="col-source">
                      <EditableSelect
                        value={connector.source || ''}
                        options={sourcesWithColors}
                        onChange={(value) => updateConnector(connector.id, 'source', value)}
                        placeholder="Select Source"
                        className="table-select"
                      />
                    </td>
                    <td className="col-connection">
                      <select
                        value={connector.type}
                        onChange={(e) => updateConnector(connector.id, 'type', e.target.value as any)}
                        className="table-select"
                      >
                        <option value="DP 1.2">DP 1.2</option>
                        <option value="HDMI 2.0">HDMI 2.0</option>
                        <option value="12G SDI">12G SDI</option>
                      </select>
                    </td>
                    <td className="col-resolution">
                      <input
                        value={connector.resolution || ''}
                        onChange={(e) => updateConnector(connector.id, 'resolution', e.target.value)}
                        className="table-input"
                        placeholder="Resolution"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="col-resolution">
                      <input
                        value={connector.resolution || ''}
                        onChange={(e) => updateConnector(connector.id, 'resolution', e.target.value)}
                        className="table-input"
                        placeholder="Resolution"
                      />
                    </td>
                    <td className="col-connection">
                      <select
                        value={connector.type}
                        onChange={(e) => updateConnector(connector.id, 'type', e.target.value as any)}
                        className="table-select"
                      >
                        <option value="DP 1.2">DP 1.2</option>
                        <option value="HDMI 2.0">HDMI 2.0</option>
                        <option value="12G SDI">12G SDI</option>
                      </select>
                    </td>
                    <td className="col-destination">
                      <EditableSelect
                        value={connector.destination || ''}
                        options={destinationsWithColors}
                        onChange={(value) => updateConnector(connector.id, 'destination', value)}
                        placeholder="Select Destination"
                        className="table-select"
                      />
                    </td>
                  </>
                )}
                <td className="col-actions">
                  <button className="remove-btn" onClick={() => removeConnector(connector.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NodeShell>
  );
}

export default memo(CardNode);
