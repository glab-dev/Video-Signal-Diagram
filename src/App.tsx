import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from '@xyflow/react';
import type { Connection, Edge, Node, NodeChange, NodePositionChange, NodeDimensionChange, OnSelectionChangeParams } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { nodeTypes } from './components/nodes';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import UpdateNotification from './components/UpdateNotification';
import EdgeLabelEditor from './components/EdgeLabelEditor';
import EdgeStyleEditor, { type EdgeStyleOptions } from './components/EdgeStyleEditor';
import StyledEdge from './components/edges/StyledEdge';
import { PageOverlay } from './components/PageOverlay';
import { usePageGrid } from './hooks/usePageGrid';
import { useNodeSummaries, NodeSummariesContext } from './hooks/useNodeSummaries';
import { usePermanentSourcesProvider, PermanentSourcesContext } from './hooks/usePermanentSources';
import { useCanvasSettings } from './hooks/useCanvasSettings';
import { useCascadeLock, getGenericIOData, extractLabelNumber } from './hooks/useCascadeLock';
import { useHistory } from './hooks/useHistory';
import { useEdgeColorSync } from './hooks/useEdgeColorSync';
import { useClipboard } from './hooks/useClipboard';
import { useGearBuilder } from './hooks/useGearBuilder';
import { useExportPNG } from './hooks/useExportPNG';
import { CascadeLockContext } from './contexts/CascadeLockContext';
import type { EdgeData } from './components/EdgeLabelEditor';
import type { ProjectData } from './types';
import './App.css';

// Custom edge types
const edgeTypes = {
  styled: StyledEdge,
};

const defaultProject: ProjectData = {
  id: uuidv4(),
  name: 'Untitled Project',
  nodes: [],
  edges: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultProject.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultProject.edges);
  const [projectName, setProjectName] = useState(defaultProject.name);
  const [projectId, setProjectId] = useState(defaultProject.id);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [showEdgeStyleEditor, setShowEdgeStyleEditor] = useState(false);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeIds: string[] } | null>(null);
  const [cascadeDirection, setCascadeDirection] = useState<'right' | 'left'>('right');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes, setViewport, deleteElements } = useReactFlow();

  // Refs for stable callback access
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const cascadeDirectionRef = useRef<'right' | 'left'>(cascadeDirection);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    cascadeDirectionRef.current = cascadeDirection;
  }, [cascadeDirection]);

  // ---- Extracted hooks ----

  const {
    paperSize, orientation, customWidth, customHeight,
    showMiniMap, showRatioOverlay, setShowRatioOverlay,
    handlePaperSizeChange, handleOrientationChange, handleCustomSizeChange,
    getViewportCenter, toggleMiniMap, canvasDimensions, centerPage,
  } = useCanvasSettings({ reactFlowWrapper, screenToFlowPosition, setViewport });

  const { handleAddGearNode, handleSaveGearPreset, handleApplyGearToSelected } =
    useGearBuilder({ setNodes, getViewportCenter });

  const cascadeLockContext = useCascadeLock({ nodes, setNodes });

  const { handleUndo, handleRedo, canUndo, canRedo, isUndoRedo, resetHistory } =
    useHistory({ nodes, edges, setNodes, setEdges });

  const { getOriginalSourceColor } = useEdgeColorSync({ nodes, edges, setNodes, setEdges });

  const { handleCopy, handlePaste, resetCopiedNodes } =
    useClipboard({ getNodes, setNodes, setEdges, edgesRef, cascadeDirectionRef });

  const { handleExportPNG } = useExportPNG({ getNodes, projectName });

  // Single store subscription for node summaries - shared via context to all nodes
  const nodeSummaries = useNodeSummaries();

  // Permanent sources that persist across all projects
  const permanentSourcesValue = usePermanentSourcesProvider();

  // Calculate occupied pages based on node positions
  const pages = usePageGrid({
    nodes,
    pageWidth: canvasDimensions.width,
    pageHeight: canvasDimensions.height,
  });

  // ---- Node change handler (cascade movement + group resize) ----

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const currentNodes = nodesRef.current;

    // Check for position changes on locked cascade nodes
    const positionChanges = changes.filter(
      (c): c is NodePositionChange => c.type === 'position' && c.dragging === true
    );

    if (positionChanges.length > 0) {
      const processedGroups = new Set<string>();
      const additionalChanges: NodePositionChange[] = [];

      for (const change of positionChanges) {
        const node = currentNodes.find(n => n.id === change.id);
        if (!node) continue;

        const nodeData = getGenericIOData(node);
        const lockId = nodeData?.cascadeLockId;
        if (!lockId || processedGroups.has(lockId)) continue;

        processedGroups.add(lockId);

        const groupNodes = currentNodes.filter(n => {
          const data = getGenericIOData(n);
          return data?.cascadeLockId === lockId;
        }).sort((a, b) => {
          const dataA = getGenericIOData(a);
          const dataB = getGenericIOData(b);
          const numA = extractLabelNumber(dataA?.label || '');
          const numB = extractLabelNumber(dataB?.label || '');
          return numA - numB;
        });

        if (change.position) {
          const deltaX = change.position.x - node.position.x;
          const deltaY = change.position.y - node.position.y;

          for (const groupNode of groupNodes) {
            if (groupNode.id !== change.id) {
              additionalChanges.push({
                id: groupNode.id,
                type: 'position',
                position: {
                  x: groupNode.position.x + deltaX,
                  y: groupNode.position.y + deltaY,
                },
                dragging: true,
              });
            }
          }
        }
      }

      if (additionalChanges.length > 0) {
        onNodesChange([...changes, ...additionalChanges]);
        return;
      }
    }

    // Handle group resize
    const dimensionChanges = changes.filter(
      (c): c is NodeDimensionChange => c.type === 'dimensions' && c.resizing === true
    );

    if (dimensionChanges.length > 0) {
      for (const change of dimensionChanges) {
        const node = currentNodes.find(n => n.id === change.id);
        if (!node || !node.selected) continue;

        const oldW = node.measured?.width ?? node.width;
        const oldH = node.measured?.height ?? node.height;
        if (!oldW || !oldH || !change.dimensions?.width || !change.dimensions?.height) continue;

        const scaleX = change.dimensions.width / oldW;
        const scaleY = change.dimensions.height / oldH;

        const otherSelected = currentNodes.filter(n => n.selected && n.id !== change.id);
        if (otherSelected.length === 0) continue;

        const oldCenterX = node.position.x + oldW / 2;
        const oldCenterY = node.position.y + oldH / 2;

        const posChange = changes.find(
          (c): c is NodePositionChange => c.type === 'position' && c.id === change.id
        );
        const newPos = posChange?.position ?? node.position;
        const newCenterX = newPos.x + change.dimensions.width / 2;
        const newCenterY = newPos.y + change.dimensions.height / 2;

        const otherIds = new Set(otherSelected.map(n => n.id));

        onNodesChange(changes);

        setNodes(nds => nds.map(n => {
          if (!otherIds.has(n.id)) return n;
          const ow = n.measured?.width ?? n.width;
          const oh = n.measured?.height ?? n.height;
          if (!ow || !oh) return n;

          const scaledW = ow * scaleX;
          const scaledH = oh * scaleY;

          const myCenterX = n.position.x + ow / 2;
          const myCenterY = n.position.y + oh / 2;
          const newMyCenterX = newCenterX + (myCenterX - oldCenterX) * scaleX;
          const newMyCenterY = newCenterY + (myCenterY - oldCenterY) * scaleY;

          return {
            ...n,
            width: scaledW,
            height: scaledH,
            position: {
              x: newMyCenterX - scaledW / 2,
              y: newMyCenterY - scaledH / 2,
            },
          };
        }));
        return;
      }
    }

    onNodesChange(changes);
  }, [onNodesChange, setNodes]);

  // ---- Connection handling ----

  const [pendingConnection, setPendingConnection] = useState<{ params: Connection; edgeColor: string } | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const edgeColor = params.source ? getOriginalSourceColor(params.source, params.sourceHandle) : '#888';
      setPendingConnection({ params, edgeColor });
    },
    [getOriginalSourceColor]
  );

  const handleSaveNewConnection = useCallback(
    (data: EdgeData) => {
      if (!pendingConnection) return;

      const { params, edgeColor } = pendingConnection;

      let displayLabel = data.label || '';
      const cableInfo: string[] = [];
      if (data.cableType) cableInfo.push(data.cableType);
      if (data.cableLength) cableInfo.push(data.cableLength);

      if (cableInfo.length > 0) {
        displayLabel = displayLabel
          ? `${displayLabel} (${cableInfo.join(' - ')})`
          : cableInfo.join(' - ');
      }

      const edge: Edge = {
        ...params,
        id: uuidv4(),
        type: 'styled',
        style: { stroke: edgeColor, strokeWidth: 2 },
        label: displayLabel || undefined,
        labelStyle: { fill: '#fff', fontWeight: 600 },
        labelBgStyle: { fill: '#333', fillOpacity: 0.8 },
        labelBgPadding: [4, 8] as [number, number],
        data: {
          cableType: data.cableType,
          cableLength: data.cableLength,
          rawLabel: data.label,
          showOutline: false,
          dashPattern: '',
          animated: false,
        },
      } as Edge;
      setEdges((eds) => addEdge(edge, eds));

      // Auto-fill connection names on source and target nodes
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (sourceNode && targetNode) {
        const sourceHandleId = params.sourceHandle;
        const targetHandleId = params.targetHandle;

        const targetLabel = targetNode.data?.label || '';
        let targetInputName = '';

        if (targetNode.data?.inputs && Array.isArray(targetNode.data.inputs)) {
          const targetInput = targetNode.data.inputs.find(
            (inp: { id?: string; name?: string }) => inp.id === targetHandleId || `input-${inp.id}` === targetHandleId
          );
          if (targetInput) {
            targetInputName = targetInput.name || '';
          }
        }

        if (targetNode.data?.cards && Array.isArray(targetNode.data.cards)) {
          const handleParts = targetHandleId?.split('-') || [];
          if (handleParts.length >= 3 && handleParts[0] === 'input') {
            const cardId = handleParts[1];
            const connectorId = handleParts.slice(2).join('-');
            const targetCards = targetNode.data.cards as Array<{ id: string; label?: string; connectors: Array<{ id: string }> }>;
            const targetCard = targetCards.find(c => c.id === cardId);
            if (targetCard) {
              const connectorIndex = targetCard.connectors.findIndex(c => c.id === connectorId);
              targetInputName = targetCard.label ? `${targetCard.label} #${connectorIndex + 1}` : `Card #${connectorIndex + 1}`;
            }
          }
        }

        const sourceLabel = sourceNode.data?.label || '';
        let sourceOutputName = '';

        if (sourceNode.data?.outputs && Array.isArray(sourceNode.data.outputs)) {
          const sourceOutput = sourceNode.data.outputs.find(
            (out: { id?: string; name?: string }) => out.id === sourceHandleId || `output-${out.id}` === sourceHandleId
          );
          if (sourceOutput) {
            sourceOutputName = sourceOutput.name || '';
          }
        }

        if (sourceNode.data?.cards && Array.isArray(sourceNode.data.cards)) {
          const handleParts = sourceHandleId?.split('-') || [];
          if (handleParts.length >= 3 && handleParts[0] === 'output') {
            const cardId = handleParts[1];
            const connectorId = handleParts.slice(2).join('-');
            const sourceCards = sourceNode.data.cards as Array<{ id: string; label?: string; connectors: Array<{ id: string }> }>;
            const sourceCard = sourceCards.find(c => c.id === cardId);
            if (sourceCard) {
              const connectorIndex = sourceCard.connectors.findIndex(c => c.id === connectorId);
              sourceOutputName = sourceCard.label ? `${sourceCard.label} #${connectorIndex + 1}` : `Card #${connectorIndex + 1}`;
            }
          }
        }

        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === params.source && node.type !== 'switcher' && node.data?.outputs && Array.isArray(node.data.outputs)) {
              const destinationText = targetInputName
                ? `${targetLabel} - ${targetInputName}`
                : targetLabel;

              const updatedOutputs = (node.data.outputs as Array<{ id?: string; destination?: string }>).map(
                (out) => {
                  if (out.id === sourceHandleId || `output-${out.id}` === sourceHandleId) {
                    return { ...out, destination: destinationText };
                  }
                  return out;
                }
              );
              return { ...node, data: { ...node.data, outputs: updatedOutputs } };
            }

            if (node.id === params.source && node.data?.cards && Array.isArray(node.data.cards)) {
              const handleParts = sourceHandleId?.split('-') || [];
              if (handleParts.length >= 3 && handleParts[0] === 'output') {
                const cardId = handleParts[1];
                const connectorId = handleParts.slice(2).join('-');

                const destinationText = targetInputName
                  ? `${targetLabel} - ${targetInputName}`
                  : targetLabel;

                const updatedCards = (node.data.cards as Array<{ id: string; connectors: Array<{ id: string; destination?: string }> }>).map(
                  (card) => {
                    if (card.id === cardId) {
                      const updatedConnectors = card.connectors.map((conn) => {
                        if (conn.id === connectorId) {
                          return { ...conn, destination: destinationText };
                        }
                        return conn;
                      });
                      return { ...card, connectors: updatedConnectors };
                    }
                    return card;
                  }
                );
                return { ...node, data: { ...node.data, cards: updatedCards } };
              }
            }

            if (node.id === params.target && node.data?.inputs && Array.isArray(node.data.inputs)) {
              const updatedInputs = (node.data.inputs as Array<{ id?: string; source?: string; connection?: string }>).map(
                (inp) => {
                  if (inp.id === targetHandleId || `input-${inp.id}` === targetHandleId) {
                    if ('connection' in inp) {
                      return { ...inp, connection: sourceLabel };
                    }
                    const sourceText = sourceOutputName
                      ? `${sourceLabel} - ${sourceOutputName}`
                      : sourceLabel;
                    return { ...inp, source: sourceText };
                  }
                  return inp;
                }
              );
              return { ...node, data: { ...node.data, inputs: updatedInputs } };
            }

            if (node.id === params.target && node.data?.cards && Array.isArray(node.data.cards)) {
              const handleParts = targetHandleId?.split('-') || [];
              if (handleParts.length >= 3 && handleParts[0] === 'input') {
                const cardId = handleParts[1];
                const connectorId = handleParts.slice(2).join('-');

                const updatedCards = (node.data.cards as Array<{ id: string; connectors: Array<{ id: string; source?: string }> }>).map(
                  (card) => {
                    if (card.id === cardId) {
                      const updatedConnectors = card.connectors.map((conn) => {
                        if (conn.id === connectorId) {
                          return { ...conn, source: sourceLabel };
                        }
                        return conn;
                      });
                      return { ...card, connectors: updatedConnectors };
                    }
                    return card;
                  }
                );
                return { ...node, data: { ...node.data, cards: updatedCards } };
              }
            }

            return node;
          })
        );
      }
      setPendingConnection(null);
    },
    [pendingConnection, setEdges, nodes, setNodes]
  );

  const handleCancelNewConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // ---- Node management ----

  const onAddNode = useCallback(
    (node: Node) => {
      setNodes((nds) => [...nds, node]);
    },
    [setNodes]
  );

  const projectData: ProjectData = {
    id: projectId,
    name: projectName,
    nodes,
    edges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const onLoadProject = useCallback(
    (project: ProjectData) => {
      resetHistory(project.nodes, project.edges);
      isUndoRedo.current = true;
      setNodes(project.nodes);
      // Migrate existing edges to use 'styled' type
      const migratedEdges = project.edges.map(edge => ({
        ...edge,
        type: 'styled',
        data: {
          ...((edge.data || {}) as Record<string, unknown>),
          showOutline: (edge.data as Record<string, unknown>)?.showOutline ?? false,
          dashPattern: (edge.data as Record<string, unknown>)?.dashPattern ?? '',
          animated: (edge.data as Record<string, unknown>)?.animated ?? false,
        },
      }));
      setEdges(migratedEdges);
      setProjectName(project.name);
      setProjectId(project.id);
      resetCopiedNodes();
    },
    [setNodes, setEdges, resetHistory, isUndoRedo, resetCopiedNodes]
  );

  const onNewProject = useCallback(() => {
    if (nodes.length > 0 && !confirm('Create new project? Unsaved changes will be lost.')) {
      return;
    }
    resetHistory([], []);
    isUndoRedo.current = true;
    setNodes([]);
    setEdges([]);
    setProjectName('Untitled Project');
    setProjectId(uuidv4());
    resetCopiedNodes();
    centerPage();
  }, [nodes.length, setNodes, setEdges, centerPage, resetHistory, isUndoRedo, resetCopiedNodes]);

  // ---- Selection & edge editing ----

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length > 0) {
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
        const currentEdges = edgesRef.current;

        const edgeIdsToSelect = new Set<string>();
        for (const e of currentEdges) {
          if (!e.selected && selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)) {
            edgeIdsToSelect.add(e.id);
          }
        }

        if (edgeIdsToSelect.size > 0) {
          setEdges(eds => eds.map(e =>
            edgeIdsToSelect.has(e.id) ? { ...e, selected: true } : e
          ));
        }
      }
    },
    [setEdges]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const selectedEdges = edges.filter(e => e.selected);
      if (selectedEdges.length > 1) {
        setSelectedEdgeIds(selectedEdges.map(e => e.id));
        setShowEdgeStyleEditor(true);
      } else {
        setEditingEdge(edge);
      }
    },
    [edges]
  );

  const handleApplyEdgeStyles = useCallback(
    (options: EdgeStyleOptions) => {
      setEdges((eds) =>
        eds.map((e) =>
          selectedEdgeIds.includes(e.id)
            ? {
                ...e,
                type: 'styled',
                data: {
                  ...((e.data || {}) as Record<string, unknown>),
                  showOutline: options.showOutline,
                  dashPattern: options.dashPattern,
                  animated: options.animated,
                },
              }
            : e
        )
      );
      setShowEdgeStyleEditor(false);
      setSelectedEdgeIds([]);
    },
    [selectedEdgeIds, setEdges]
  );

  const handleCancelEdgeStyleEdit = useCallback(() => {
    setShowEdgeStyleEditor(false);
    setSelectedEdgeIds([]);
  }, []);

  const getSelectedEdgeStyleOptions = useCallback((): EdgeStyleOptions => {
    if (selectedEdgeIds.length === 0) {
      return { showOutline: false, dashPattern: '', animated: false };
    }
    const firstEdge = edges.find(e => e.id === selectedEdgeIds[0]);
    const data = firstEdge?.data as Record<string, unknown> | undefined;
    return {
      showOutline: (data?.showOutline as boolean) ?? false,
      dashPattern: (data?.dashPattern as string) ?? '',
      animated: (data?.animated as boolean) ?? false,
    };
  }, [selectedEdgeIds, edges]);

  const handleSaveEdgeLabel = useCallback(
    (data: EdgeData) => {
      if (editingEdge) {
        let displayLabel = data.label || '';
        const cableInfo: string[] = [];
        if (data.cableType) cableInfo.push(data.cableType);
        if (data.cableLength) cableInfo.push(data.cableLength);

        if (cableInfo.length > 0) {
          displayLabel = displayLabel
            ? `${displayLabel} (${cableInfo.join(' - ')})`
            : cableInfo.join(' - ');
        }

        setEdges((eds) =>
          eds.map((e) =>
            e.id === editingEdge.id
              ? {
                  ...e,
                  label: displayLabel || undefined,
                  data: {
                    ...((e.data || {}) as Record<string, unknown>),
                    cableType: data.cableType,
                    cableLength: data.cableLength,
                    rawLabel: data.label,
                  },
                }
              : e
          )
        );
      }
      setEditingEdge(null);
    },
    [editingEdge, setEdges]
  );

  const handleDeleteEdgeLabel = useCallback(() => {
    if (editingEdge) {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === editingEdge.id
            ? { ...e, label: undefined }
            : e
        )
      );
    }
    setEditingEdge(null);
  }, [editingEdge, setEdges]);

  const handleDeleteConnection = useCallback(() => {
    if (editingEdge && confirm('Delete this connection?')) {
      setEdges((eds) => eds.filter((e) => e.id !== editingEdge.id));
    }
    setEditingEdge(null);
  }, [editingEdge, setEdges]);

  const handleCancelEdgeEdit = useCallback(() => {
    setEditingEdge(null);
  }, []);

  // ---- Context menu & duplication ----

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const selectedNodes = nodes.filter(n => n.selected || n.id === node.id);
      const nodeIds = selectedNodes.map(n => n.id);
      setContextMenu({ x: event.clientX, y: event.clientY, nodeIds });
    },
    [nodes]
  );

  const handleDuplicateNodes = useCallback(() => {
    if (!contextMenu) return;

    const nodesToDuplicate = nodes.filter(n => contextMenu.nodeIds.includes(n.id));
    const newNodes: Node[] = [];
    const oldToNewIdMap = new Map<string, string>();

    nodesToDuplicate.forEach((node) => {
      const newId = uuidv4();
      oldToNewIdMap.set(node.id, newId);

      const newNode: Node = {
        ...node,
        id: newId,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        selected: false,
        data: { ...node.data },
      };
      newNodes.push(newNode);
    });

    setNodes((nds) => [...nds, ...newNodes]);

    const newEdges: Edge[] = [];
    edges.forEach((edge) => {
      if (oldToNewIdMap.has(edge.source) && oldToNewIdMap.has(edge.target)) {
        const newEdge: Edge = {
          ...edge,
          id: uuidv4(),
          source: oldToNewIdMap.get(edge.source)!,
          target: oldToNewIdMap.get(edge.target)!,
          selected: false,
        };
        newEdges.push(newEdge);
      }
    });

    if (newEdges.length > 0) {
      setEdges((eds) => [...eds, ...newEdges]);
    }

    setContextMenu(null);
  }, [contextMenu, nodes, edges, setNodes, setEdges]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ---- Keyboard shortcuts ----

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target?.tagName?.toUpperCase() || '';
      const isInInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        handleUndo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault();
        event.stopPropagation();
        handleRedo();
        return;
      }

      if (isInInput) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = getNodes().filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault();
          deleteElements({ nodes: selectedNodes, edges: selectedEdges });
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        event.stopPropagation();
        handleCopy();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        event.stopPropagation();
        handlePaste();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleUndo, handleRedo, handleCopy, handlePaste, getNodes, edges, deleteElements]);

  // ---- Drag & drop ----

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const presetData = event.dataTransfer.getData('application/reactflow');
      if (presetData) {
        try {
          const parsed = JSON.parse(presetData);
          if (parsed.type === 'savedPreset' && parsed.preset) {
            const position = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            const node: Node = {
              id: uuidv4(),
              type: parsed.preset.nodeType,
              position,
              data: { ...parsed.preset.data },
            };
            setNodes((nds) => [...nds, node]);
            return;
          }
        } catch (error) {
          console.error('Failed to parse preset data:', error);
        }
      }

      const files = event.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          const node: Node = {
            id: uuidv4(),
            type: 'image',
            position,
            data: {
              label: file.name,
              imageUrl: e.target?.result as string,
            },
          };
          setNodes((nds) => [...nds, node]);
        };
        reader.readAsDataURL(file);
      }
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdges((eds) =>
        eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
      );
    },
    [setEdges]
  );

  // ---- Render ----

  return (
    <div className="app">
      <Sidebar
        onAddNode={onAddNode}
        getViewportCenter={getViewportCenter}
        projectData={projectData}
        onLoadProject={onLoadProject}
        onNewProject={onNewProject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportPNG={handleExportPNG}
        cascadeDirection={cascadeDirection}
        onCascadeDirectionChange={setCascadeDirection}
      />

      <div className="flow-wrapper" ref={reactFlowWrapper}>
        <CascadeLockContext.Provider value={cascadeLockContext}>
        <PermanentSourcesContext.Provider value={permanentSourcesValue}>
        <NodeSummariesContext.Provider value={nodeSummaries}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onInit={centerPage}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
          snapToGrid
          snapGrid={[10, 10]}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode={['Shift', 'Meta']}
          selectionOnDrag
          selectionMode={SelectionMode.Full}
          edgesReconnectable={false}
          edgesFocusable
          selectNodesOnDrag
          panOnDrag={[1]}
          minZoom={0.005}
          maxZoom={8}
          proOptions={{ hideAttribution: true }}
        >
          <PageOverlay pages={pages} showRatioOverlay={showRatioOverlay} paperSize={paperSize} />
          <Controls />
          {showMiniMap && (
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'note') return '#ffeb3b';
                if (node.type === 'ledWall') return '#ff6600';
                if (node.type === 'processor') return '#0088cc';
                if (node.type === 'switcher') return '#4a148c';
                return '#666';
              }}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
          )}
          <Panel position="top-left" className="project-panel">
            <input
              className="project-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project Name"
            />
          </Panel>
          <Panel position="bottom-right">
            <button
              onClick={toggleMiniMap}
              className="minimap-toggle-btn"
              title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
            >
              {showMiniMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
            </button>
          </Panel>
        </ReactFlow>
        </NodeSummariesContext.Provider>
        </PermanentSourcesContext.Provider>
        </CascadeLockContext.Provider>
      </div>

      <RightPanel
        paperSize={paperSize}
        orientation={orientation}
        customWidth={customWidth}
        customHeight={customHeight}
        onPaperSizeChange={handlePaperSizeChange}
        onOrientationChange={handleOrientationChange}
        onCustomSizeChange={handleCustomSizeChange}
        nodes={nodes}
        edges={edges}
        projectName={projectName}
        onAddGearNode={handleAddGearNode}
        onSaveGearPreset={handleSaveGearPreset}
        selectedNodeCount={nodes.filter(n => n.selected).length}
        onApplyToSelected={handleApplyGearToSelected}
        showRatioOverlay={showRatioOverlay}
        onToggleRatioOverlay={() => setShowRatioOverlay(prev => !prev)}
        pageCount={pages.length}
      />

      {editingEdge && (
        <EdgeLabelEditor
          initialLabel={(editingEdge.data as { rawLabel?: string })?.rawLabel || (editingEdge.label as string) || ''}
          initialCableType={(editingEdge.data as { cableType?: string })?.cableType || ''}
          initialCableLength={(editingEdge.data as { cableLength?: string })?.cableLength || ''}
          onSave={handleSaveEdgeLabel}
          onDeleteLabel={handleDeleteEdgeLabel}
          onDeleteConnection={handleDeleteConnection}
          onCancel={handleCancelEdgeEdit}
        />
      )}

      {showEdgeStyleEditor && (
        <EdgeStyleEditor
          selectedCount={selectedEdgeIds.length}
          initialOptions={getSelectedEdgeStyleOptions()}
          onApply={handleApplyEdgeStyles}
          onCancel={handleCancelEdgeStyleEdit}
        />
      )}

      {pendingConnection && (
        <EdgeLabelEditor
          initialLabel=""
          initialCableType=""
          initialCableLength=""
          onSave={handleSaveNewConnection}
          onCancel={handleCancelNewConnection}
          isNewConnection
        />
      )}

      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={handleCloseContextMenu} />
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
              zIndex: 10000,
            }}
          >
            <button className="context-menu-item" onClick={handleDuplicateNodes}>
              Duplicate ({contextMenu.nodeIds.length} {contextMenu.nodeIds.length === 1 ? 'node' : 'nodes'})
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <Flow />
      <UpdateNotification />
    </ReactFlowProvider>
  );
}

export default App;
