import { memo, useCallback, useState, useRef, useMemo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer, useUpdateNodeInternals, useNodes } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { BarcoE3NodeData, BarcoCard, CardConnector, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PresetMenu from '../PresetMenu';

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
  const updateNodeInternals = useUpdateNodeInternals();
  const allNodes = useNodes();
  const [_draggedCard, setDraggedCard] = useState<string | null>(null);
  const dragStartY = useRef<number>(0);
  const dragStartSpacing = useRef<number>(0);

  // Get all source node names (nodes that have outputs - they can be sources)
  const sourceNames = useMemo(() => {
    const names: string[] = [];
    allNodes.forEach((node: Node) => {
      // Skip this node itself
      if (node.id === id) return;
      // Include nodes that have outputs (they can be sources)
      const nodeData = node.data as { label?: string; outputs?: unknown[]; cards?: Array<{ cardType?: string }> };
      const hasOutputs = nodeData?.outputs && Array.isArray(nodeData.outputs) && nodeData.outputs.length > 0;
      const hasOutputCards = nodeData?.cards && Array.isArray(nodeData.cards) &&
        nodeData.cards.some(c => c.cardType === 'output' || c.cardType === 'system');
      if (hasOutputs || hasOutputCards) {
        const label = nodeData.label;
        if (label && typeof label === 'string' && !names.includes(label)) {
          names.push(label);
        }
      }
    });
    return names.sort();
  }, [allNodes, id]);

  // Get all destination node names (nodes that have inputs - they can be destinations)
  const destinationNames = useMemo(() => {
    const names: string[] = [];
    allNodes.forEach((node: Node) => {
      // Skip this node itself
      if (node.id === id) return;
      // Include nodes that have inputs (they can be destinations)
      const nodeData = node.data as { label?: string; inputs?: unknown[]; cards?: Array<{ cardType?: string }> };
      const hasInputs = nodeData?.inputs && Array.isArray(nodeData.inputs) && nodeData.inputs.length > 0;
      const hasInputCards = nodeData?.cards && Array.isArray(nodeData.cards) &&
        nodeData.cards.some(c => c.cardType === 'input');
      if (hasInputs || hasInputCards) {
        const label = nodeData.label;
        if (label && typeof label === 'string' && !names.includes(label)) {
          names.push(label);
        }
      }
    });
    return names.sort();
  }, [allNodes, id]);

  const updateLabel = useCallback(
    (value: string) => {
      updateNodeData(id, { label: value });
    },
    [id, updateNodeData]
  );

  const updateIpAddress = useCallback(
    (value: string) => {
      updateNodeData(id, { ipAddress: value });
    },
    [id, updateNodeData]
  );

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      const barcoData = presetData as BarcoE3NodeData;
      updateNodeData(id, {
        label: barcoData.label,
        color: barcoData.color,
        cards: barcoData.cards
      });
    },
    [id, updateNodeData]
  );

  const handleReset = useCallback(() => {
    // Reset all card spacing and handle sides to default
    const resetCards = data.cards.map((card) => ({
      ...card,
      spacing: 0,
      handleSide: undefined
    }));
    updateNodeData(id, { cards: resetCards });
  }, [id, data.cards, updateNodeData]);

  const toggleLayout = useCallback(() => {
    const newLayout = data.layout === 'sideBySide' ? 'stacked' : 'sideBySide';
    updateNodeData(id, { layout: newLayout });
    // Force React Flow to update handle positions after layout change
    setTimeout(() => updateNodeInternals(id), 0);
  }, [id, data.layout, updateNodeData, updateNodeInternals]);

  const [isDraggingSystem, setIsDraggingSystem] = useState(false);
  const [systemDropTarget, setSystemDropTarget] = useState<'input' | 'output' | null>(null);

  const handleSystemMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSystem(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Determine which section the mouse is over
      const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      const inputSection = elements.find(el => el.classList.contains('barco-cards-section') && el.querySelector('[data-section-type="input"]'));
      const outputSection = elements.find(el => el.classList.contains('barco-cards-section') && el.querySelector('[data-section-type="output"]'));

      if (inputSection) {
        setSystemDropTarget('input');
      } else if (outputSection) {
        setSystemDropTarget('output');
      } else {
        setSystemDropTarget(null);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();

      // Determine drop target at mouse release position
      const elements = document.elementsFromPoint(upEvent.clientX, upEvent.clientY);
      const inputSection = elements.find(el => el.classList.contains('barco-cards-section') && el.querySelector('[data-section-type="input"]'));
      const outputSection = elements.find(el => el.classList.contains('barco-cards-section') && el.querySelector('[data-section-type="output"]'));

      let dropTarget: 'input' | 'output' | null = null;
      if (inputSection) {
        dropTarget = 'input';
      } else if (outputSection) {
        dropTarget = 'output';
      }

      if (dropTarget) {
        const currentLayout = data.layout || 'stacked';
        if (currentLayout === 'sideBySide') {
          // In side-by-side mode, check if dropping on top or bottom half of the section
          const targetElement = dropTarget === 'input'
            ? elements.find(el => el.classList.contains('barco-cards-section') && el.querySelector('[data-section-type="input"]'))
            : elements.find(el => el.classList.contains('barco-cards-section') && el.querySelector('[data-section-type="output"]'));

          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const position = upEvent.clientY < midY ? 'top' : 'bottom';
            updateNodeData(id, { systemColumn: dropTarget, systemPosition: position });
          }
        } else {
          updateNodeData(id, { systemPosition: dropTarget === 'input' ? 'top' : 'bottom' });
        }
      }

      setIsDraggingSystem(false);
      setSystemDropTarget(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, data.layout, updateNodeData]);

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
        destination: card.cardType === 'output' || card.cardType === 'system' ? '' : undefined,
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
    (cardType: 'input' | 'output' | 'system') => {
      const labels = {
        input: 'TRI COMBO - INPUT',
        output: 'TRI COMBO - OUTPUT',
        system: 'SYSTEM CARD'
      };

      const newCard: BarcoCard = {
        id: uuidv4(),
        label: labels[cardType],
        cardType,
        connectors: [
          { id: uuidv4(), type: 'DP 1.2', source: cardType === 'input' ? '' : undefined, resolution: '3840x2160@60', destination: cardType === 'output' || cardType === 'system' ? '' : undefined },
          { id: uuidv4(), type: 'HDMI 2.0', source: cardType === 'input' ? '' : undefined, resolution: '3840x2160@60', destination: cardType === 'output' || cardType === 'system' ? '' : undefined },
          { id: uuidv4(), type: '12G SDI', source: cardType === 'input' ? '' : undefined, resolution: '3840x2160@60', destination: cardType === 'output' || cardType === 'system' ? '' : undefined },
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
      const newCards = data.cards.map((card) => {
        if (card.id !== cardId) return card;

        if (card.cardType === 'input') {
          // Input cards: default left (undefined), toggle to right
          return { ...card, handleSide: card.handleSide === 'right' ? undefined : 'right' };
        } else {
          // Output and System cards: default right (undefined), toggle to left
          return { ...card, handleSide: card.handleSide === 'left' ? undefined : 'left' };
        }
      });
      updateNodeData(id, { cards: newCards });
      // Force React Flow to update handle positions
      setTimeout(() => updateNodeInternals(id), 0);
    },
    [id, data.cards, updateNodeData, updateNodeInternals]
  );

  const handleSpacingMouseDown = useCallback(
    (e: React.MouseEvent, cardId: string, currentSpacing: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedCard(cardId);
      dragStartY.current = e.clientY;
      dragStartSpacing.current = currentSpacing || 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - dragStartY.current;
        const newSpacing = Math.max(0, dragStartSpacing.current + deltaY);

        const newCards = data.cards.map((card) =>
          card.id === cardId ? { ...card, spacing: newSpacing } : card
        );
        updateNodeData(id, { cards: newCards });
        // Force React Flow to update handle positions in real-time during drag
        updateNodeInternals(id);
      };

      const handleMouseUp = () => {
        setDraggedCard(null);
        // Force React Flow to update handle positions after spacing change
        setTimeout(() => updateNodeInternals(id), 0);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [id, data.cards, updateNodeData, updateNodeInternals]
  );

  const inputCards = data.cards.filter((card) => card.cardType === 'input');
  const outputCards = data.cards.filter((card) => card.cardType === 'output');
  const systemCards = data.cards.filter((card) => card.cardType === 'system');

  const layout = data.layout || 'sideBySide';
  const systemColumn = data.systemColumn || 'output';
  const systemPosition = data.systemPosition || 'bottom';

  // Render a single card component
  const renderCard = useCallback((card: BarcoCard, cardType: 'input' | 'output' | 'system', allCards: BarcoCard[]) => {
    const isInputCard = cardType === 'input';

    return (
      <div key={card.id} style={{ marginTop: `${card.spacing || 0}px` }}>
        <div className={`barco-card ${isInputCard ? 'input-card' : 'output-card'} ${isDraggingSystem && cardType === 'system' ? 'dragging' : ''}`}>
          <div className="card-title-bar">
            {isInputCard && (
              <input
                className="card-title-input"
                value={card.label}
                onChange={(e) => updateCardLabel(card.id, e.target.value)}
                placeholder="Card Name"
              />
            )}
            {!isInputCard && cardType === 'output' && (
              <input
                className="card-title-input"
                value={card.label}
                onChange={(e) => updateCardLabel(card.id, e.target.value)}
                placeholder="Card Name"
              />
            )}
            <div
              className="spacing-drag-handle nodrag"
              onMouseDown={(e) => handleSpacingMouseDown(e, card.id, card.spacing || 0)}
              title="Drag down to move card and create space above"
            >
              ⋮
            </div>
            <button
              className="toggle-side-btn"
              onClick={() => toggleCardSide(card.id)}
              title={`Switch handles to ${isInputCard ? (card.handleSide === 'right' ? 'left' : 'right') : (card.handleSide === 'left' ? 'right' : 'left')}`}
            >
              {isInputCard ? (card.handleSide === 'right' ? '←' : '→') : (card.handleSide === 'left' ? '→' : '←')}
            </button>
            <button className="remove-card-btn" onClick={() => removeCard(card.id)}>×</button>
          </div>
          {isInputCard && (
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
          )}
          {!isInputCard && cardType === 'output' && (
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
          )}
          <div className="card-connectors">
            {card.connectors.map((connector, connectorIndex) => (
              <div key={`${connector.id}-${card.handleSide || 'default'}`} className="card-row">
                {isInputCard ? (
                  // Input card connectors
                  card.handleSide !== 'right' ? (
                    <>
                      <Handle
                        key={`${card.id}-${connector.id}-left-${card.handleSide || 'default'}`}
                        type="target"
                        position={Position.Left}
                        id={`${card.id}-${connector.id}-left`}
                        className="port-handle"
                        style={{
                          top: `${calculateHandlePosition(card.id, connectorIndex, allCards, cardType, inputCards, outputCards, systemCards, layout, systemPosition, systemColumn)}px`
                        }}
                      />
                      <select
                        value={sourceNames.includes(connector.source || '') ? connector.source : (connector.source ? connector.source : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            const customName = prompt('Enter custom source name:');
                            if (customName) {
                              updateConnector(card.id, connector.id, 'source', customName);
                            }
                          } else {
                            updateConnector(card.id, connector.id, 'source', e.target.value);
                          }
                        }}
                        className="card-field source"
                      >
                        <option value="">Select Source</option>
                        {connector.source && !sourceNames.includes(connector.source) && (
                          <option value={connector.source}>{connector.source}</option>
                        )}
                        {sourceNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
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
                      <select
                        value={sourceNames.includes(connector.source || '') ? connector.source : (connector.source ? connector.source : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            const customName = prompt('Enter custom source name:');
                            if (customName) {
                              updateConnector(card.id, connector.id, 'source', customName);
                            }
                          } else {
                            updateConnector(card.id, connector.id, 'source', e.target.value);
                          }
                        }}
                        className="card-field source"
                      >
                        <option value="">Select Source</option>
                        {connector.source && !sourceNames.includes(connector.source) && (
                          <option value={connector.source}>{connector.source}</option>
                        )}
                        {sourceNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
                      <Handle
                        key={`${card.id}-${connector.id}-right-${card.handleSide || 'default'}`}
                        type="target"
                        position={Position.Right}
                        id={`${card.id}-${connector.id}-right`}
                        className="port-handle"
                        style={{
                          top: `${calculateHandlePosition(card.id, connectorIndex, allCards, cardType, inputCards, outputCards, systemCards, layout, systemPosition, systemColumn)}px`
                        }}
                      />
                    </>
                  )
                ) : (
                  // Output and System card connectors
                  card.handleSide === 'left' ? (
                    <>
                      <Handle
                        key={`${card.id}-${connector.id}-left-${card.handleSide || 'default'}`}
                        type="source"
                        position={Position.Left}
                        id={`${card.id}-${connector.id}-left`}
                        className="port-handle"
                        style={{
                          top: `${calculateHandlePosition(card.id, connectorIndex, allCards, cardType, inputCards, outputCards, systemCards, layout, systemPosition, systemColumn)}px`
                        }}
                      />
                      <select
                        value={destinationNames.includes(connector.destination || '') ? connector.destination : (connector.destination ? connector.destination : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            const customName = prompt('Enter custom destination name:');
                            if (customName) {
                              updateConnector(card.id, connector.id, 'destination', customName);
                            }
                          } else {
                            updateConnector(card.id, connector.id, 'destination', e.target.value);
                          }
                        }}
                        className="card-field destination"
                      >
                        <option value="">Select Destination</option>
                        {connector.destination && !destinationNames.includes(connector.destination) && (
                          <option value={connector.destination}>{connector.destination}</option>
                        )}
                        {destinationNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
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
                      <select
                        value={destinationNames.includes(connector.destination || '') ? connector.destination : (connector.destination ? connector.destination : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            const customName = prompt('Enter custom destination name:');
                            if (customName) {
                              updateConnector(card.id, connector.id, 'destination', customName);
                            }
                          } else {
                            updateConnector(card.id, connector.id, 'destination', e.target.value);
                          }
                        }}
                        className="card-field destination"
                      >
                        <option value="">Select Destination</option>
                        {connector.destination && !destinationNames.includes(connector.destination) && (
                          <option value={connector.destination}>{connector.destination}</option>
                        )}
                        {destinationNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
                      <Handle
                        key={`${card.id}-${connector.id}-right-${card.handleSide || 'default'}`}
                        type="source"
                        position={Position.Right}
                        id={`${card.id}-${connector.id}-right`}
                        className="port-handle"
                        style={{
                          top: `${calculateHandlePosition(card.id, connectorIndex, allCards, cardType, inputCards, outputCards, systemCards, layout, systemPosition, systemColumn)}px`
                        }}
                      />
                    </>
                  )
                )}
              </div>
            ))}
          </div>
          <button className="add-connector-btn-small" onClick={() => addConnector(card.id)}>+</button>
        </div>
      </div>
    );
  }, [sourceNames, destinationNames, updateCardLabel, handleSpacingMouseDown, toggleCardSide, removeCard, updateConnector, removeConnector, addConnector, inputCards, outputCards, systemCards, layout, systemPosition, systemColumn, isDraggingSystem]);

  // Render SYSTEM subsection (draggable header + cards)
  const renderSystemSubsection = () => {
    // Get spacing from first system card to apply to header
    const firstSystemCardSpacing = systemCards.length > 0 ? (systemCards[0].spacing || 0) : 0;

    // Create modified system cards array where first card has no spacing (it's applied to the header)
    const modifiedSystemCards = systemCards.map((card, index) =>
      index === 0 ? { ...card, spacing: 0 } : card
    );

    return (
      <div className="barco-cards-subsection" key="system-subsection" style={{ marginTop: `${firstSystemCardSpacing}px` }}>
        <div
          className="cards-section-header system-header nodrag"
          style={{ cursor: isDraggingSystem ? 'grabbing' : 'grab' }}
          onMouseDown={handleSystemMouseDown}
        >
          <span>⋮⋮ SYSTEM</span>
          <button className="add-card-btn nodrag" onClick={() => addCard('system')}>+ Card</button>
        </div>
        {systemCards.length > 0 && (
          <div className="cards-grid">
            {modifiedSystemCards.map((card) => renderCard(card, 'system', modifiedSystemCards))}
          </div>
        )}
      </div>
    );
  };

  // Render a section (INPUT or OUTPUT) with optional SYSTEM subsection
  const renderSection = (sectionType: 'input' | 'output', cards: BarcoCard[], includeSystemBefore: boolean, includeSystemAfter: boolean) => {
    const sectionTitle = sectionType === 'input' ? 'INPUT CARDS' : 'OUTPUT CARDS';

    return (
      <div
        className={`barco-cards-section ${systemDropTarget === sectionType ? 'drop-target' : ''}`}
        key={sectionType}
      >
        <div
          className="cards-section-header nodrag"
          data-section-type={sectionType}
        >
          <span>{sectionTitle}</span>
          <button className="add-card-btn nodrag" onClick={() => addCard(sectionType)}>+ Card</button>
        </div>
        {includeSystemBefore && renderSystemSubsection()}
        <div className="cards-grid">
          {cards.map((card) => renderCard(card, sectionType, cards))}
        </div>
        {includeSystemAfter && renderSystemSubsection()}
      </div>
    );
  };

  return (
    <div
      className={`node-barco-e3 ${selected ? 'selected' : ''} ${layout === 'sideBySide' ? 'side-by-side' : ''}`}
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
        <PresetMenu
          nodeType="barcoE3"
          currentData={data}
          onLoadPreset={handleLoadPreset}
          onReset={handleReset}
        />
        <button
          className="layout-toggle-btn nodrag"
          onClick={toggleLayout}
          title={layout === 'stacked' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
        >
          {layout === 'stacked' ? '⇄' : '⇅'}
        </button>
      </div>
      <div className="node-ip-row">
        <span className="ip-label">IP:</span>
        <input
          className="ip-input"
          value={data.ipAddress || ''}
          onChange={(e) => updateIpAddress(e.target.value)}
          placeholder="192.168.1.100"
        />
      </div>

      <div className="barco-e3-content">
        {layout === 'stacked' ? (
          <>
            {/* STACKED MODE - vertical layout with SYSTEM at top or bottom */}
            {systemPosition === 'top' && renderSystemSubsection()}
            {renderSection('input', inputCards, false, false)}
            {renderSection('output', outputCards, false, false)}
            {systemPosition === 'bottom' && renderSystemSubsection()}
          </>
        ) : (
          <>
            {/* SIDE-BY-SIDE MODE - 2 columns only, SYSTEM inside INPUT or OUTPUT column at top or bottom */}
            {renderSection(
              'input',
              inputCards,
              systemColumn === 'input' && systemPosition === 'top',
              systemColumn === 'input' && systemPosition === 'bottom'
            )}
            {renderSection(
              'output',
              outputCards,
              systemColumn === 'output' && systemPosition === 'top',
              systemColumn === 'output' && systemPosition === 'bottom'
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to calculate handle vertical position
function calculateHandlePosition(
  cardId: string,
  connectorIndex: number,
  cards: BarcoCard[],
  cardType: 'input' | 'output' | 'system',
  allInputCards: BarcoCard[],
  allOutputCards: BarcoCard[],
  allSystemCards: BarcoCard[],
  layout: 'stacked' | 'sideBySide',
  systemPosition: 'top' | 'bottom',
  systemColumn: 'input' | 'output'
): number {
  const headerHeight = 50; // Node header
  const ipRowHeight = 30; // IP row
  const sectionHeaderHeight = 40; // Cards section header
  const cardTitleHeight = 32; // Card title bar
  const cardHeaderRowHeight = 20; // Column headers row (input/output only)
  const connectorRowHeight = 32; // Each horizontal connector row

  // Find which card index this is
  const cardIndex = cards.findIndex((c) => c.id === cardId);

  // Calculate total height of previous cards in the same section
  let previousCardsHeight = 0;
  for (let i = 0; i < cardIndex; i++) {
    const previousCard = cards[i];
    const hasHeaderRow = previousCard.cardType !== 'system';
    previousCardsHeight += cardTitleHeight + (hasHeaderRow ? cardHeaderRowHeight : 0) + (previousCard.connectors.length * connectorRowHeight) + 40; // 40 for padding and + button
    previousCardsHeight += previousCard.spacing || 0; // Add spacing for this card
  }

  // Calculate offset based on card type and layout
  let baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;

  if (layout === 'stacked') {
    // STACKED MODE
    if (systemPosition === 'top') {
      // System at top, then input, then output
      if (cardType === 'system') {
        // System is first
        baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;
      } else if (cardType === 'input') {
        // Input is after system
        const systemSectionHeight = allSystemCards.reduce((sum, card) => {
          return sum + cardTitleHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + (allSystemCards.length > 0 ? sectionHeaderHeight : 0);
        baseOffset = headerHeight + ipRowHeight + systemSectionHeight + sectionHeaderHeight;
      } else if (cardType === 'output') {
        // Output is after system and input
        const systemSectionHeight = allSystemCards.reduce((sum, card) => {
          return sum + cardTitleHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + (allSystemCards.length > 0 ? sectionHeaderHeight : 0);
        const inputSectionHeight = allInputCards.reduce((sum, card) => {
          return sum + cardTitleHeight + cardHeaderRowHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + sectionHeaderHeight;
        baseOffset = headerHeight + ipRowHeight + systemSectionHeight + inputSectionHeight + sectionHeaderHeight;
      }
    } else {
      // System at bottom (default): input, output, then system
      if (cardType === 'input') {
        // Input is first
        baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;
      } else if (cardType === 'output') {
        // Output is after input
        const inputSectionHeight = allInputCards.reduce((sum, card) => {
          return sum + cardTitleHeight + cardHeaderRowHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + sectionHeaderHeight;
        baseOffset = headerHeight + ipRowHeight + inputSectionHeight + sectionHeaderHeight;
      } else if (cardType === 'system') {
        // System is after input and output
        const inputSectionHeight = allInputCards.reduce((sum, card) => {
          return sum + cardTitleHeight + cardHeaderRowHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + sectionHeaderHeight;
        const outputSectionHeight = allOutputCards.reduce((sum, card) => {
          return sum + cardTitleHeight + cardHeaderRowHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + sectionHeaderHeight;
        baseOffset = headerHeight + ipRowHeight + inputSectionHeight + outputSectionHeight + sectionHeaderHeight;
      }
    }
  } else {
    // SIDE-BY-SIDE MODE
    if (systemColumn === 'input') {
      // System in input column: system, input, output (output rendered separately)
      if (cardType === 'system') {
        // System is first
        baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;
      } else if (cardType === 'input') {
        // Input is after system
        const systemSectionHeight = allSystemCards.reduce((sum, card) => {
          return sum + cardTitleHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + (allSystemCards.length > 0 ? sectionHeaderHeight : 0);
        baseOffset = headerHeight + ipRowHeight + systemSectionHeight + sectionHeaderHeight;
      } else if (cardType === 'output') {
        // Output is rendered independently
        baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;
      }
    } else {
      // System in output column (default): input, system, output
      if (cardType === 'input') {
        // Input is first
        baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;
      } else if (cardType === 'system') {
        // System is after input (in output column)
        baseOffset = headerHeight + ipRowHeight + sectionHeaderHeight;
      } else if (cardType === 'output') {
        // Output is after system
        const systemSectionHeight = allSystemCards.reduce((sum, card) => {
          return sum + cardTitleHeight + (card.connectors.length * connectorRowHeight) + 40 + (card.spacing || 0);
        }, 0) + (allSystemCards.length > 0 ? sectionHeaderHeight : 0);
        baseOffset = headerHeight + ipRowHeight + systemSectionHeight + sectionHeaderHeight;
      }
    }
  }

  // Center the handle vertically in the connector row
  const handleOffsetInRow = connectorRowHeight / 2;
  const hasHeaderRow = cardType !== 'system';

  return baseOffset + previousCardsHeight + cardTitleHeight + (hasHeaderRow ? cardHeaderRowHeight : 0) + (connectorIndex * connectorRowHeight) + handleOffsetInRow;
}

export default memo(BarcoE3Node);
