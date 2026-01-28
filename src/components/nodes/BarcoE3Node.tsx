import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { BarcoE3NodeData, BarcoCard, CardConnector } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Top 15 video resolutions plus Custom option
const VIDEO_RESOLUTIONS = [
  '3840x2160@60',
  '3840x2160@30',
  '1920x1080@60',
  '1920x1080@30',
  '1920x1080@24',
  '1280x720@60',
  '1280x720@30',
  '4096x2160@60',
  '4096x2160@24',
  '2560x1440@60',
  '7680x4320@60',
  '1920x1200@60',
  '2048x1080@60',
  '1366x768@60',
  '1600x1200@60',
  'Custom',
] as const;

type BarcoE3NodeProps = NodeProps & {
  data: BarcoE3NodeData;
  measured?: { width: number; height: number };
};

function BarcoE3Node({ id, data, selected, measured }: BarcoE3NodeProps) {
  const { updateNodeData } = useReactFlow();

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  const updateCardLabel = useCallback(
    (cardId: string, value: string) => {
      const newCards = data.cards.map((card) =>
        card.id === cardId ? { ...card, label: value } : card
      );
      updateNodeData(id, { cards: newCards });
    },
    [id, data.cards, updateNodeData]
  );

  const updateConnector = useCallback(
    (cardId: string, connectorId: string, field: keyof CardConnector, value: string) => {
      const newCards = data.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              connectors: card.connectors.map((conn) =>
                conn.id === connectorId ? { ...conn, [field]: value } : conn
              ),
            }
          : card
      );
      updateNodeData(id, { cards: newCards });
    },
    [id, data.cards, updateNodeData]
  );

  const addConnector = useCallback(
    (cardId: string) => {
      const card = data.cards.find((c) => c.id === cardId);
      if (!card) return;

      const newConnector: CardConnector = {
        id: uuidv4(),
        type: 'HDMI 2.0',
        source: card.cardType === 'input' ? '' : undefined,
        resolution: '3840x2160@60',
        destination: card.cardType === 'output' ? '' : undefined,
      };

      const newCards = data.cards.map((c) =>
        c.id === cardId ? { ...c, connectors: [...c.connectors, newConnector] } : c
      );
      updateNodeData(id, { cards: newCards });
    },
    [id, data.cards, updateNodeData]
  );

  const removeConnector = useCallback(
    (cardId: string, connectorId: string) => {
      const newCards = data.cards.map((card) =>
        card.id === cardId
          ? { ...card, connectors: card.connectors.filter((c) => c.id !== connectorId) }
          : card
      );
      updateNodeData(id, { cards: newCards });
    },
    [id, data.cards, updateNodeData]
  );

  const addCard = useCallback(
    (cardType: 'input' | 'output') => {
      const newCard: BarcoCard = {
        id: uuidv4(),
        label: cardType === 'input' ? 'TRI COMBO - INPUT' : 'TRI COMBO - OUTPUT',
        cardType,
        connectors: [
          { id: uuidv4(), type: 'DP 1.2', source: cardType === 'input' ? '' : undefined, resolution: '3840x2160@60', destination: cardType === 'output' ? '' : undefined },
          { id: uuidv4(), type: 'HDMI 2.0', source: cardType === 'input' ? '' : undefined, resolution: '3840x2160@60', destination: cardType === 'output' ? '' : undefined },
          { id: uuidv4(), type: '12G SDI', source: cardType === 'input' ? '' : undefined, resolution: '3840x2160@60', destination: cardType === 'output' ? '' : undefined },
        ],
      };
      updateNodeData(id, { cards: [...data.cards, newCard] });
    },
    [id, data.cards, updateNodeData]
  );

  const removeCard = useCallback(
    (cardId: string) => {
      updateNodeData(id, { cards: data.cards.filter((c) => c.id !== cardId) });
    },
    [id, data.cards, updateNodeData]
  );

  const toggleCardSide = useCallback(
    (cardId: string) => {
      const newCards = data.cards.map((card) =>
        card.id === cardId
          ? { ...card, handleSide: card.handleSide === 'right' ? 'left' : 'right' }
          : card
      );
      updateNodeData(id, { cards: newCards });
    },
    [id, data.cards, updateNodeData]
  );

  const inputCards = data.cards.filter((card) => card.cardType === 'input');
  const outputCards = data.cards.filter((card) => card.cardType === 'output');

  return (
    <div
      className={`node-barco-e3 ${selected ? 'selected' : ''}`}
      style={{
        borderColor: data.color || '#006400',
        width: measured?.width,
        height: measured?.height,
      }}
    >
      <NodeResizer
        minWidth={600}
        minHeight={300}
        isVisible={selected}
        lineStyle={{ borderColor: '#00aaff' }}
        handleStyle={{ backgroundColor: '#00aaff', width: 8, height: 8 }}
      />
      <div className="node-header" style={{ backgroundColor: data.color || '#006400' }}>
        <input
          className="node-title-input light"
          value={data.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Barco E3"
        />
      </div>

      <div className="barco-e3-content">
        {/* Input Cards Section */}
        <div className="barco-cards-section">
          <div className="cards-section-header">
            <span>INPUT CARDS</span>
            <button className="add-card-btn" onClick={() => addCard('input')}>+ Card</button>
          </div>
          <div className="cards-grid">
            {inputCards.map((card) => (
              <div key={card.id} className="barco-card input-card">
                <div className="card-title-bar">
                  <input
                    className="card-title-input"
                    value={card.label}
                    onChange={(e) => updateCardLabel(card.id, e.target.value)}
                    placeholder="Card Name"
                  />
                  <button
                    className="toggle-side-btn"
                    onClick={() => toggleCardSide(card.id)}
                    title={`Switch handles to ${card.handleSide === 'right' ? 'left' : 'right'}`}
                  >
                    {card.handleSide === 'right' ? '←' : '→'}
                  </button>
                  <button className="remove-card-btn" onClick={() => removeCard(card.id)}>×</button>
                </div>
                <div className="card-header-row">
                  {card.handleSide !== 'right' ? (
                    <>
                      <span className="card-col-header source">SOURCE</span>
                      <span className="card-col-header connector">CONNECTOR</span>
                      <span className="card-col-header resolution">RESOLUTION</span>
                    </>
                  ) : (
                    <>
                      <span className="card-col-header resolution">RESOLUTION</span>
                      <span className="card-col-header connector">CONNECTOR</span>
                      <span className="card-col-header source">SOURCE</span>
                    </>
                  )}
                </div>
                <div className="card-connectors">
                  {card.connectors.map((connector, connectorIndex) => (
                    <div key={connector.id} className="card-row">
                      {card.handleSide !== 'right' ? (
                        <>
                          <Handle
                            type="target"
                            position={Position.Left}
                            id={`${card.id}-${connector.id}`}
                            className="port-handle"
                            style={{
                              top: `${calculateHandlePosition(card.id, connectorIndex, inputCards, 'input', inputCards)}px`
                            }}
                          />
                          <input
                            value={connector.source || ''}
                            onChange={(e) => updateConnector(card.id, connector.id, 'source', e.target.value)}
                            className="card-field source"
                            placeholder="Source"
                          />
                          <select
                            value={connector.type}
                            onChange={(e) => updateConnector(card.id, connector.id, 'type', e.target.value as any)}
                            className="card-field connector"
                          >
                            <option value="DP 1.2">DP 1.2</option>
                            <option value="HDMI 2.0">HDMI 2.0</option>
                            <option value="12G SDI">12G SDI</option>
                          </select>
                          {VIDEO_RESOLUTIONS.includes(connector.resolution as any) && connector.resolution !== 'Custom' ? (
                            <select
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                            >
                              <option value="">Select Resolution</option>
                              {VIDEO_RESOLUTIONS.map((res) => (
                                <option key={res} value={res}>{res}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                              placeholder="Custom Resolution"
                            />
                          )}
                          <button className="remove-btn" onClick={() => removeConnector(card.id, connector.id)}>×</button>
                        </>
                      ) : (
                        <>
                          <button className="remove-btn" onClick={() => removeConnector(card.id, connector.id)}>×</button>
                          {VIDEO_RESOLUTIONS.includes(connector.resolution as any) && connector.resolution !== 'Custom' ? (
                            <select
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                            >
                              <option value="">Select Resolution</option>
                              {VIDEO_RESOLUTIONS.map((res) => (
                                <option key={res} value={res}>{res}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                              placeholder="Custom Resolution"
                            />
                          )}
                          <select
                            value={connector.type}
                            onChange={(e) => updateConnector(card.id, connector.id, 'type', e.target.value as any)}
                            className="card-field connector"
                          >
                            <option value="DP 1.2">DP 1.2</option>
                            <option value="HDMI 2.0">HDMI 2.0</option>
                            <option value="12G SDI">12G SDI</option>
                          </select>
                          <input
                            value={connector.source || ''}
                            onChange={(e) => updateConnector(card.id, connector.id, 'source', e.target.value)}
                            className="card-field source"
                            placeholder="Source"
                          />
                          <Handle
                            type="target"
                            position={Position.Right}
                            id={`${card.id}-${connector.id}`}
                            className="port-handle"
                            style={{
                              top: `${calculateHandlePosition(card.id, connectorIndex, inputCards, 'input', inputCards)}px`
                            }}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button className="add-connector-btn-small" onClick={() => addConnector(card.id)}>+</button>
              </div>
            ))}
          </div>
        </div>

        {/* Output Cards Section */}
        <div className="barco-cards-section">
          <div className="cards-section-header">
            <span>OUTPUT CARDS</span>
            <button className="add-card-btn" onClick={() => addCard('output')}>+ Card</button>
          </div>
          <div className="cards-grid">
            {outputCards.map((card) => (
              <div key={card.id} className="barco-card output-card">
                <div className="card-title-bar">
                  <input
                    className="card-title-input"
                    value={card.label}
                    onChange={(e) => updateCardLabel(card.id, e.target.value)}
                    placeholder="Card Name"
                  />
                  <button
                    className="toggle-side-btn"
                    onClick={() => toggleCardSide(card.id)}
                    title={`Switch handles to ${card.handleSide === 'right' ? 'left' : 'right'}`}
                  >
                    {card.handleSide === 'right' ? '←' : '→'}
                  </button>
                  <button className="remove-card-btn" onClick={() => removeCard(card.id)}>×</button>
                </div>
                <div className="card-header-row">
                  {card.handleSide === 'left' ? (
                    <>
                      <span className="card-col-header destination">DESTINATION</span>
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
                  {card.connectors.map((connector, connectorIndex) => (
                    <div key={connector.id} className="card-row">
                      {card.handleSide === 'left' ? (
                        <>
                          <Handle
                            type="source"
                            position={Position.Left}
                            id={`${card.id}-${connector.id}`}
                            className="port-handle"
                            style={{
                              top: `${calculateHandlePosition(card.id, connectorIndex, outputCards, 'output', inputCards)}px`
                            }}
                          />
                          <input
                            value={connector.destination || ''}
                            onChange={(e) => updateConnector(card.id, connector.id, 'destination', e.target.value)}
                            className="card-field destination"
                            placeholder="Destination"
                          />
                          <select
                            value={connector.type}
                            onChange={(e) => updateConnector(card.id, connector.id, 'type', e.target.value as any)}
                            className="card-field connector"
                          >
                            <option value="DP 1.2">DP 1.2</option>
                            <option value="HDMI 2.0">HDMI 2.0</option>
                            <option value="12G SDI">12G SDI</option>
                          </select>
                          {VIDEO_RESOLUTIONS.includes(connector.resolution as any) && connector.resolution !== 'Custom' ? (
                            <select
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                            >
                              <option value="">Select Resolution</option>
                              {VIDEO_RESOLUTIONS.map((res) => (
                                <option key={res} value={res}>{res}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                              placeholder="Custom Resolution"
                            />
                          )}
                          <button className="remove-btn" onClick={() => removeConnector(card.id, connector.id)}>×</button>
                        </>
                      ) : (
                        <>
                          <button className="remove-btn" onClick={() => removeConnector(card.id, connector.id)}>×</button>
                          {VIDEO_RESOLUTIONS.includes(connector.resolution as any) && connector.resolution !== 'Custom' ? (
                            <select
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                            >
                              <option value="">Select Resolution</option>
                              {VIDEO_RESOLUTIONS.map((res) => (
                                <option key={res} value={res}>{res}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field resolution"
                              placeholder="Custom Resolution"
                            />
                          )}
                          <select
                            value={connector.type}
                            onChange={(e) => updateConnector(card.id, connector.id, 'type', e.target.value as any)}
                            className="card-field connector"
                          >
                            <option value="DP 1.2">DP 1.2</option>
                            <option value="HDMI 2.0">HDMI 2.0</option>
                            <option value="12G SDI">12G SDI</option>
                          </select>
                          <input
                            value={connector.destination || ''}
                            onChange={(e) => updateConnector(card.id, connector.id, 'destination', e.target.value)}
                            className="card-field destination"
                            placeholder="Destination"
                          />
                          <Handle
                            type="source"
                            position={Position.Right}
                            id={`${card.id}-${connector.id}`}
                            className="port-handle"
                            style={{
                              top: `${calculateHandlePosition(card.id, connectorIndex, outputCards, 'output', inputCards)}px`
                            }}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button className="add-connector-btn-small" onClick={() => addConnector(card.id)}>+</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate handle vertical position
function calculateHandlePosition(
  cardId: string,
  connectorIndex: number,
  cards: BarcoCard[],
  cardType: 'input' | 'output',
  allInputCards: BarcoCard[]
): number {
  const headerHeight = 50; // Node header
  const sectionHeaderHeight = 40; // Cards section header
  const cardTitleHeight = 32; // Card title bar
  const cardHeaderRowHeight = 20; // Column headers row
  const connectorRowHeight = 32; // Each horizontal connector row

  // Find which card index this is
  const cardIndex = cards.findIndex((c) => c.id === cardId);

  // Calculate total height of previous cards in the same section
  let previousCardsHeight = 0;
  for (let i = 0; i < cardIndex; i++) {
    const previousCard = cards[i];
    previousCardsHeight += cardTitleHeight + cardHeaderRowHeight + (previousCard.connectors.length * connectorRowHeight) + 40; // 40 for padding and + button
  }

  // Calculate offset based on card type (input cards are at top, output cards at bottom)
  let baseOffset = headerHeight + sectionHeaderHeight;

  if (cardType === 'output') {
    // Add height of input section
    const inputSectionHeight = allInputCards.reduce((sum, card) => {
      return sum + cardTitleHeight + cardHeaderRowHeight + (card.connectors.length * connectorRowHeight) + 40;
    }, 0) + 40; // Extra padding for section
    baseOffset += inputSectionHeight;
  }

  // Center the handle vertically in the connector row
  const handleOffsetInRow = connectorRowHeight / 2;

  return baseOffset + previousCardsHeight + cardTitleHeight + cardHeaderRowHeight + (connectorIndex * connectorRowHeight) + handleOffsetInRow;
}

export default memo(BarcoE3Node);
