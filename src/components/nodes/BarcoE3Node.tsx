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
          { id: uuidv4(), type: 'DP 1.2', source: cardType === 'input' ? '' : undefined, resolution: '', destination: cardType === 'output' ? '' : undefined },
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
                  <button className="remove-card-btn" onClick={() => removeCard(card.id)}>×</button>
                </div>
                <div className="card-connectors">
                  {card.connectors.map((connector, connectorIndex) => (
                    <div key={connector.id} className="card-connector-stacked">
                      <Handle
                        type="target"
                        position={Position.Left}
                        id={`${card.id}-${connector.id}`}
                        className="port-handle"
                        style={{
                          top: `${calculateHandlePosition(card.id, connectorIndex, inputCards, 'input')}px`
                        }}
                      />
                      <div className="card-fields-wrapper">
                        <input
                          value={connector.source || ''}
                          onChange={(e) => updateConnector(card.id, connector.id, 'source', e.target.value)}
                          className="card-field-stacked"
                          placeholder="Source"
                        />
                        <select
                          value={connector.type}
                          onChange={(e) => updateConnector(card.id, connector.id, 'type', e.target.value as any)}
                          className="card-field-stacked"
                        >
                          <option value="DP 1.2">DP 1.2</option>
                          <option value="HDMI 2.0">HDMI 2.0</option>
                          <option value="12G SDI">12G SDI</option>
                        </select>
                        {VIDEO_RESOLUTIONS.includes(connector.resolution as any) && connector.resolution !== 'Custom' ? (
                          <select
                            value={connector.resolution || ''}
                            onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                            className="card-field-stacked"
                          >
                            <option value="">Select Resolution</option>
                            {VIDEO_RESOLUTIONS.map((res) => (
                              <option key={res} value={res}>{res}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <select
                              value="Custom"
                              onChange={(e) => {
                                if (e.target.value !== 'Custom') {
                                  updateConnector(card.id, connector.id, 'resolution', e.target.value);
                                }
                              }}
                              className="card-field-stacked"
                            >
                              <option value="">Select Resolution</option>
                              {VIDEO_RESOLUTIONS.map((res) => (
                                <option key={res} value={res}>{res}</option>
                              ))}
                            </select>
                            <input
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field-stacked"
                              placeholder="Custom Resolution"
                            />
                          </>
                        )}
                      </div>
                      <button className="remove-btn-stacked" onClick={() => removeConnector(card.id, connector.id)}>×</button>
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
                  <button className="remove-card-btn" onClick={() => removeCard(card.id)}>×</button>
                </div>
                <div className="card-connectors">
                  {card.connectors.map((connector, connectorIndex) => (
                    <div key={connector.id} className="card-connector-stacked">
                      <div className="card-fields-wrapper">
                        {VIDEO_RESOLUTIONS.includes(connector.resolution as any) && connector.resolution !== 'Custom' ? (
                          <select
                            value={connector.resolution || ''}
                            onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                            className="card-field-stacked"
                          >
                            <option value="">Select Resolution</option>
                            {VIDEO_RESOLUTIONS.map((res) => (
                              <option key={res} value={res}>{res}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <select
                              value="Custom"
                              onChange={(e) => {
                                if (e.target.value !== 'Custom') {
                                  updateConnector(card.id, connector.id, 'resolution', e.target.value);
                                }
                              }}
                              className="card-field-stacked"
                            >
                              <option value="">Select Resolution</option>
                              {VIDEO_RESOLUTIONS.map((res) => (
                                <option key={res} value={res}>{res}</option>
                              ))}
                            </select>
                            <input
                              value={connector.resolution || ''}
                              onChange={(e) => updateConnector(card.id, connector.id, 'resolution', e.target.value)}
                              className="card-field-stacked"
                              placeholder="Custom Resolution"
                            />
                          </>
                        )}
                        <select
                          value={connector.type}
                          onChange={(e) => updateConnector(card.id, connector.id, 'type', e.target.value as any)}
                          className="card-field-stacked"
                        >
                          <option value="DP 1.2">DP 1.2</option>
                          <option value="HDMI 2.0">HDMI 2.0</option>
                          <option value="12G SDI">12G SDI</option>
                        </select>
                        <input
                          value={connector.destination || ''}
                          onChange={(e) => updateConnector(card.id, connector.id, 'destination', e.target.value)}
                          className="card-field-stacked"
                          placeholder="Destination"
                        />
                      </div>
                      <button className="remove-btn-stacked" onClick={() => removeConnector(card.id, connector.id)}>×</button>
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={`${card.id}-${connector.id}`}
                        className="port-handle"
                        style={{
                          top: `${calculateHandlePosition(card.id, connectorIndex, outputCards, 'output')}px`
                        }}
                      />
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
  cardType: 'input' | 'output'
): number {
  const headerHeight = 50; // Node header
  const sectionHeaderHeight = 40; // Cards section header
  const cardTitleHeight = 32; // Card title bar
  const connectorStackedHeight = 90; // Each stacked connector block (3 fields + padding)

  // Find which card index this is
  const cardIndex = cards.findIndex((c) => c.id === cardId);

  // Calculate offset based on card type (input cards are at top, output cards at bottom)
  const baseOffset = cardType === 'input'
    ? headerHeight + sectionHeaderHeight
    : headerHeight + sectionHeaderHeight + 300; // Rough estimate for input section

  // Add spacing for previous cards in same section (assuming 2 cards per row)
  const cardsPerRow = 2;
  const cardRow = Math.floor(cardIndex / cardsPerRow);

  const cardSpacing = 240; // Approximate height per card (increased for stacked layout)

  // Center the handle vertically in the connector block
  const handleOffsetInConnector = 45; // Half of connectorStackedHeight

  return baseOffset + (cardRow * cardSpacing) + cardTitleHeight + (connectorIndex * connectorStackedHeight) + handleOffsetInConnector + 16;
}

export default memo(BarcoE3Node);
