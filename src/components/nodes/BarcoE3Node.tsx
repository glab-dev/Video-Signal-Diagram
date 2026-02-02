import { memo, useCallback, useState, useRef, useMemo } from 'react';
import type { DragEvent } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useNodeSummariesContext } from '../../hooks/useNodeSummaries';
import { usePermanentSources } from '../../hooks/usePermanentSources';
import { useHandlePositions } from '../../hooks/useHandlePositions';
import type { BarcoE3NodeData, BarcoCard, CardConnector, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import NodeShell from './NodeShell';
import EditableSelect from '../EditableSelect';

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
};

function BarcoE3Node({ id, data, selected, width, height }: BarcoE3NodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeSummaries = useNodeSummariesContext();
  const { sources: permanentSources } = usePermanentSources();
  const [_draggedCard, setDraggedCard] = useState<string | null>(null);
  const dragStartY = useRef<number>(0);
  const dragStartSpacing = useRef<number>(0);

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

  const sourceNames = useMemo(() => sourcesWithColors.map(s => s.label), [sourcesWithColors]);

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

  const destinationNames = useMemo(() => destinationsWithColors.map(d => d.label), [destinationsWithColors]);

  const nodeColor = data.color || '#006400';

  // Handle drag start for category override drop zone
  const handleCategoryDragStart = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/reactflow-node', JSON.stringify({
      label: data.label,
      color: nodeColor,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [data.label, nodeColor]);

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

  // DOM measurement for accurate handle Y positions using shared hook
  const nodeRef = useRef<HTMLDivElement>(null);
  const { rowRef, positions: handleYPositions } = useHandlePositions(nodeRef, [data.cards, layout, systemPosition, systemColumn, width, height]);

  // Render a single card component
  const renderCard = useCallback((card: BarcoCard, cardType: 'input' | 'output' | 'system') => {
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
            {card.connectors.map((connector) => (
              <div key={`${connector.id}-${card.handleSide || 'default'}`} className="card-row" ref={rowRef(`${card.id}-${connector.id}`)}>
                {isInputCard ? (
                  // Input card connectors
                  card.handleSide !== 'right' ? (
                    <>
                      <EditableSelect
                        value={connector.source || ''}
                        options={sourcesWithColors}
                        onChange={(value) => updateConnector(card.id, connector.id, 'source', value)}
                        placeholder="Select Source"
                        className="card-field source"
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
                      <EditableSelect
                        value={connector.source || ''}
                        options={sourcesWithColors}
                        onChange={(value) => updateConnector(card.id, connector.id, 'source', value)}
                        placeholder="Select Source"
                        className="card-field source"
                      />
                    </>
                  )
                ) : (
                  // Output and System card connectors
                  card.handleSide === 'left' ? (
                    <>
                      <EditableSelect
                        value={connector.destination || ''}
                        options={destinationsWithColors}
                        onChange={(value) => updateConnector(card.id, connector.id, 'destination', value)}
                        placeholder="Select Destination"
                        className="card-field destination"
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
                      <EditableSelect
                        value={connector.destination || ''}
                        options={destinationsWithColors}
                        onChange={(value) => updateConnector(card.id, connector.id, 'destination', value)}
                        placeholder="Select Destination"
                        className="card-field destination"
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
  }, [sourceNames, destinationNames, sourcesWithColors, destinationsWithColors, updateCardLabel, handleSpacingMouseDown, toggleCardSide, removeCard, updateConnector, removeConnector, addConnector, isDraggingSystem, rowRef]);

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
            {modifiedSystemCards.map((card) => renderCard(card, 'system'))}
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
          {cards.map((card) => renderCard(card, sectionType))}
        </div>
        {includeSystemAfter && renderSystemSubsection()}
      </div>
    );
  };

  // Build the Handle components to pass as outsideHandles
  const handles = data.cards.map(card =>
    card.connectors.map(connector => {
      const isInput = card.cardType === 'input';
      const side = isInput
        ? (card.handleSide === 'right' ? 'right' : 'left')
        : (card.handleSide === 'left' ? 'left' : 'right');
      return (
        <Handle
          key={`${card.id}-${connector.id}-${side}-${card.handleSide || 'default'}`}
          type={isInput ? 'target' : 'source'}
          position={side === 'left' ? Position.Left : Position.Right}
          id={`${card.id}-${connector.id}-${side}`}
          className="port-handle"
          style={{ top: handleYPositions[`${card.id}-${connector.id}`] ?? 0 }}
        />
      );
    })
  );

  return (
    <NodeShell
      id={id}
      selected={selected}
      width={width}
      height={height}
      nodeType="barcoE3"
      nodeClassName="node-barco-e3"
      defaultColor="#006400"
      data={data}
      minWidth={600}
      minHeight={300}
      placeholder="Barco E3 Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      onReset={handleReset}
      extraClassName={layout === 'sideBySide' ? 'side-by-side' : ''}
      showIpRow
      ipAddress={data.ipAddress}
      onIpChange={updateIpAddress}
      nodeRef={nodeRef}
      outsideHandles={<>{handles}</>}
      headerButtons={
        <>
          <button
            className="layout-toggle-btn nodrag"
            onClick={toggleLayout}
            title={layout === 'stacked' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
          >
            {layout === 'stacked' ? '⇄' : '⇅'}
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
      <div className="barco-e3-content nodrag">
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
    </NodeShell>
  );
}

export default memo(BarcoE3Node);
