import { useCallback, useState, useRef, useEffect, createContext } from 'react';
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
  getNodesBounds,
  getViewportForBounds,
  SelectionMode,
} from '@xyflow/react';
import type { Connection, Edge, Node, NodeChange, NodePositionChange, NodeDimensionChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { toPng } from 'html-to-image';

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
import type { EdgeData } from './components/EdgeLabelEditor';
import type { ProjectData, GenericIONodeData, GearConfig, NodePreset } from './types';
import { PAPER_SIZES, type PaperSize, type Orientation } from './types';
import { savePreset } from './store/db';
import './App.css';

// Cascade Lock Context - for sharing cascade lock functionality with nodes
export interface CascadeLockContextType {
  getCascadeGroup: (nodeId: string) => { isLocked: boolean; isFirstInGroup: boolean; groupNodes: string[] };
  toggleCascadeLock: (nodeId: string) => void;
}

export const CascadeLockContext = createContext<CascadeLockContextType | null>(null);

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

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
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [cascadeDirection, setCascadeDirection] = useState<'right' | 'left'>('right');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes, setViewport } = useReactFlow();

  // Paper size state with localStorage persistence
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    const saved = localStorage.getItem('paperSize');
    return (saved as PaperSize) || 'Tabloid';
  });

  const [orientation, setOrientation] = useState<Orientation>(() => {
    const saved = localStorage.getItem('orientation');
    return (saved as Orientation) || 'landscape';
  });

  const [customWidth, setCustomWidth] = useState<number>(() => {
    const saved = localStorage.getItem('customWidth');
    return saved ? parseInt(saved) : 1200;
  });

  const [customHeight, setCustomHeight] = useState<number>(() => {
    const saved = localStorage.getItem('customHeight');
    return saved ? parseInt(saved) : 1200;
  });

  const [showMiniMap, setShowMiniMap] = useState<boolean>(() => {
    const saved = localStorage.getItem('showMiniMap');
    return saved === 'true';
  });

  const [showRatioOverlay, setShowRatioOverlay] = useState<boolean>(false);

  // Paper size change handlers
  const handlePaperSizeChange = useCallback((size: PaperSize) => {
    setPaperSize(size);
    localStorage.setItem('paperSize', size);
  }, []);

  const handleOrientationChange = useCallback((orient: Orientation) => {
    setOrientation(orient);
    localStorage.setItem('orientation', orient);
  }, []);

  const handleCustomSizeChange = useCallback((width: number, height: number) => {
    setCustomWidth(width);
    setCustomHeight(height);
    localStorage.setItem('customWidth', width.toString());
    localStorage.setItem('customHeight', height.toString());
  }, []);

  // Get the center of the current viewport in flow coordinates
  const getViewportCenter = useCallback(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return { x: 100, y: 100 };
    const rect = wrapper.getBoundingClientRect();
    return screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [screenToFlowPosition]);

  // Stagger counter for gear builder node placement
  const gearPlacementCounter = useRef(0);
  const gearPlacementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gear Builder handlers
  const handleAddGearNode = useCallback((config: GearConfig) => {
    const basePos = getViewportCenter();
    const offset = gearPlacementCounter.current * 30;
    const position = { x: basePos.x + offset, y: basePos.y + offset };
    gearPlacementCounter.current += 1;
    if (gearPlacementTimer.current) clearTimeout(gearPlacementTimer.current);
    gearPlacementTimer.current = setTimeout(() => { gearPlacementCounter.current = 0; }, 2000);

    const newNode: Node = {
      id: uuidv4(),
      type: config.nodeType,
      position,
      data: {
        label: config.label,
        color: config.color,
        layout: config.layout,
        ipAddress: config.ipAddress,
        inputs: config.inputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
        outputs: config.outputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
      },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes, getViewportCenter]);

  const handleSaveGearPreset = useCallback(async (config: GearConfig) => {
    const presetName = prompt('Enter a name for this preset:', config.label);
    if (!presetName) return;

    const preset: NodePreset = {
      id: uuidv4(),
      name: presetName,
      nodeType: config.nodeType,
      data: {
        label: config.label,
        color: config.color,
        layout: config.layout,
        ipAddress: config.ipAddress,
        inputs: config.inputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
        outputs: config.outputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
      } as GenericIONodeData,
      category: 'basic',
      createdAt: Date.now(),
    };

    await savePreset(preset);
    // Dispatch event so sidebar can refresh
    window.dispatchEvent(new CustomEvent('presetSaved'));
  }, []);

  const handleApplyGearToSelected = useCallback((config: GearConfig) => {
    setNodes(nds => nds.map(node => {
      if (!node.selected) return node;

      // Apply gear config to selected nodes
      return {
        ...node,
        type: config.nodeType,
        data: {
          ...node.data,
          label: node.data?.label || config.label, // Keep existing label
          color: config.color,
          layout: config.layout,
          ipAddress: config.ipAddress || node.data?.ipAddress,
          inputs: config.inputs.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type || 'HDMI',
          })),
          outputs: config.outputs.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type || 'HDMI',
          })),
        },
      };
    }));
  }, [setNodes]);

  const toggleMiniMap = useCallback(() => {
    setShowMiniMap(prev => {
      const newValue = !prev;
      localStorage.setItem('showMiniMap', newValue.toString());
      return newValue;
    });
  }, []);

  // Calculate canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    let dims = PAPER_SIZES[paperSize];

    // Use custom dimensions if Custom is selected
    if (paperSize === 'Custom') {
      dims = { width: customWidth, height: customHeight };
    }

    // Apply orientation
    if (orientation === 'landscape') {
      return {
        width: Math.max(dims.width, dims.height),
        height: Math.min(dims.width, dims.height)
      };
    }
    return {
      width: Math.min(dims.width, dims.height),
      height: Math.max(dims.width, dims.height)
    };
  }, [paperSize, orientation, customWidth, customHeight]);

  const canvasDimensions = getCanvasDimensions();

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

  // Center the origin page in the viewport
  const centerPage = useCallback(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const zoom = 0.75;
    const containerWidth = wrapper.clientWidth;
    const containerHeight = wrapper.clientHeight;

    const x = (containerWidth - canvasDimensions.width * zoom) / 2;
    const y = (containerHeight - canvasDimensions.height * zoom) / 2;

    setViewport({ x, y, zoom });
  }, [canvasDimensions.width, canvasDimensions.height, setViewport]);

  // Refs for stable keyboard handler access
  const nodesRef = useRef<Node[]>(nodes);
  const copiedNodesRef = useRef<Node[]>(copiedNodes);
  const edgesRef = useRef<Edge[]>(edges);
  const cascadeDirectionRef = useRef<'right' | 'left'>(cascadeDirection);

  // Keep refs in sync with state
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    copiedNodesRef.current = copiedNodes;
  }, [copiedNodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    cascadeDirectionRef.current = cascadeDirection;
  }, [cascadeDirection]);

  // Helper to extract number from end of label (e.g., "Camera 1" -> 1)
  const extractLabelNumber = useCallback((label: string): number => {
    const match = label.match(/(\d+)\s*$/);
    return match ? parseInt(match[1]) : 0;
  }, []);

  // Helper to get base label without number (e.g., "Camera 1" -> "Camera")
  const getBaseLabel = useCallback((label: string): string => {
    return label.replace(/\s*\d+\s*$/, '').trim();
  }, []);

  // Helper to safely cast node data
  const getGenericIOData = useCallback((node: Node): GenericIONodeData | null => {
    if (node.type !== 'genericIO') return null;
    return node.data as unknown as GenericIONodeData;
  }, []);

  // Detect cascade groups - GenericIO nodes with same base label, arranged vertically
  const detectCascadeGroup = useCallback((nodeId: string): string[] => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];

    const nodeData = getGenericIOData(node);
    if (!nodeData) return [];

    const baseLabel = getBaseLabel(nodeData.label || '');
    if (!baseLabel) return [];

    // Find all GenericIO nodes with the same base label
    const sameLabelNodes = nodes.filter(n => {
      const data = getGenericIOData(n);
      if (!data) return false;
      return getBaseLabel(data.label || '') === baseLabel;
    });

    // Need at least 2 nodes with the same base label
    if (sameLabelNodes.length < 2) return [];

    // Check if the x positions span a reasonable range (allows staircase arrangements)
    // Each paste offsets by ~50px, so allow ~100px per node to accommodate various arrangements
    const xPositions = sameLabelNodes.map(n => n.position.x);
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const MAX_SPREAD_PER_NODE = 100;
    const maxSpread = Math.max(400, sameLabelNodes.length * MAX_SPREAD_PER_NODE);

    if (maxX - minX > maxSpread) return [];

    // Sort by label number, then by y position
    return sameLabelNodes
      .sort((a, b) => {
        const dataA = getGenericIOData(a);
        const dataB = getGenericIOData(b);
        const numA = extractLabelNumber(dataA?.label || '');
        const numB = extractLabelNumber(dataB?.label || '');
        if (numA !== numB) return numA - numB;
        return a.position.y - b.position.y;
      })
      .map(n => n.id);
  }, [nodes, getBaseLabel, extractLabelNumber, getGenericIOData]);

  // Get cascade group info for a node
  const getCascadeGroup = useCallback((nodeId: string): { isLocked: boolean; isFirstInGroup: boolean; groupNodes: string[] } => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { isLocked: false, isFirstInGroup: false, groupNodes: [] };

    const nodeData = getGenericIOData(node);
    if (!nodeData) return { isLocked: false, isFirstInGroup: false, groupNodes: [] };

    // Check if this node is part of a locked cascade
    const cascadeLockId = nodeData.cascadeLockId;
    if (cascadeLockId) {
      const groupNodes = nodes
        .filter(n => {
          const data = getGenericIOData(n);
          return data?.cascadeLockId === cascadeLockId;
        })
        .sort((a, b) => {
          const dataA = getGenericIOData(a);
          const dataB = getGenericIOData(b);
          const numA = extractLabelNumber(dataA?.label || '');
          const numB = extractLabelNumber(dataB?.label || '');
          if (numA !== numB) return numA - numB;
          return a.position.y - b.position.y;
        })
        .map(n => n.id);
      const isFirstInGroup = groupNodes[0] === nodeId;
      return { isLocked: true, isFirstInGroup, groupNodes };
    }

    // Not locked - detect potential cascade group
    const potentialGroup = detectCascadeGroup(nodeId);
    if (potentialGroup.length >= 2) {
      const isFirstInGroup = potentialGroup[0] === nodeId;
      return { isLocked: false, isFirstInGroup, groupNodes: potentialGroup };
    }

    return { isLocked: false, isFirstInGroup: false, groupNodes: [] };
  }, [nodes, getGenericIOData, extractLabelNumber, detectCascadeGroup]);

  // Toggle cascade lock for a group
  const toggleCascadeLock = useCallback((nodeId: string) => {
    const cascadeInfo = getCascadeGroup(nodeId);
    if (cascadeInfo.groupNodes.length < 2) return;

    if (cascadeInfo.isLocked) {
      // Unlock - remove cascadeLockId from all nodes in group
      setNodes(nds => nds.map(n => {
        if (cascadeInfo.groupNodes.includes(n.id)) {
          const { cascadeLockId: _, ...restData } = n.data as unknown as GenericIONodeData;
          void _;
          return { ...n, data: restData };
        }
        return n;
      }));
    } else {
      // Lock - add same cascadeLockId to all nodes in group
      const newLockId = uuidv4();
      setNodes(nds => nds.map(n => {
        if (cascadeInfo.groupNodes.includes(n.id)) {
          return {
            ...n,
            data: { ...n.data, cascadeLockId: newLockId }
          };
        }
        return n;
      }));
    }
  }, [getCascadeGroup, setNodes]);

  // Cascade lock context value
  const cascadeLockContext: CascadeLockContextType = {
    getCascadeGroup,
    toggleCascadeLock,
  };

  // Custom nodes change handler that handles locked cascade movement and z-order
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Check for position changes on locked cascade nodes
    const positionChanges = changes.filter(
      (c): c is NodePositionChange => c.type === 'position' && c.dragging === true
    );

    if (positionChanges.length > 0) {
      // Find all locked groups being moved
      const processedGroups = new Set<string>();
      const additionalChanges: NodePositionChange[] = [];

      for (const change of positionChanges) {
        const node = nodes.find(n => n.id === change.id);
        if (!node) continue;

        const nodeData = getGenericIOData(node);
        const lockId = nodeData?.cascadeLockId;
        if (!lockId || processedGroups.has(lockId)) continue;

        processedGroups.add(lockId);

        // Get all nodes in this locked group, sorted by their label number
        const groupNodes = nodes.filter(n => {
          const data = getGenericIOData(n);
          return data?.cascadeLockId === lockId;
        }).sort((a, b) => {
          const dataA = getGenericIOData(a);
          const dataB = getGenericIOData(b);
          const numA = extractLabelNumber(dataA?.label || '');
          const numB = extractLabelNumber(dataB?.label || '');
          return numA - numB;
        });

        // Calculate the delta from the dragged node
        if (change.position) {
          const deltaX = change.position.x - node.position.x;
          const deltaY = change.position.y - node.position.y;

          // Add position changes for all other nodes in the group
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

    // Handle selection changes - maintain z-order for cascade groups
    const selectionChanges = changes.filter(c => c.type === 'select');
    if (selectionChanges.length > 0) {
      // After applying changes, ensure cascade groups maintain relative z-order
      onNodesChange(changes);

      // Set z-indices for cascade groups to maintain stacking order
      const processedLockIds = new Set<string>();
      setNodes(nds => {
        let needsZUpdate = false;
        const updatedNodes = nds.map(n => n); // Copy array

        for (const node of updatedNodes) {
          const nodeData = getGenericIOData(node);
          const lockId = nodeData?.cascadeLockId;
          if (!lockId || processedLockIds.has(lockId)) continue;
          processedLockIds.add(lockId);

          // Get all nodes in this group, sorted by label number
          const groupNodes = updatedNodes
            .filter(gn => {
              const data = getGenericIOData(gn);
              return data?.cascadeLockId === lockId;
            })
            .sort((a, b) => {
              const dataA = getGenericIOData(a);
              const dataB = getGenericIOData(b);
              const numA = extractLabelNumber(dataA?.label || '');
              const numB = extractLabelNumber(dataB?.label || '');
              return numA - numB;
            });

          // Assign z-indices: first node gets lowest, last gets highest
          groupNodes.forEach((gn, index) => {
            const targetZIndex = 1000 + index;
            const nodeIndex = updatedNodes.findIndex(un => un.id === gn.id);
            if (nodeIndex !== -1 && updatedNodes[nodeIndex].zIndex !== targetZIndex) {
              needsZUpdate = true;
              updatedNodes[nodeIndex] = { ...updatedNodes[nodeIndex], zIndex: targetZIndex };
            }
          });
        }

        return needsZUpdate ? updatedNodes : nds;
      });
      return;
    }

    // Handle group resize: when one selected node is resized, scale all other selected nodes
    // and adjust their positions proportionally so the layout scales uniformly.
    // Uses setNodes directly (rather than injecting changes) so React Flow properly
    // updates internal state and recomputes edge paths.
    const dimensionChanges = changes.filter(
      (c): c is NodeDimensionChange => c.type === 'dimensions' && c.resizing === true
    );

    if (dimensionChanges.length > 0) {
      for (const change of dimensionChanges) {
        const node = nodes.find(n => n.id === change.id);
        if (!node || !node.selected) continue;

        const oldW = node.measured?.width ?? node.width;
        const oldH = node.measured?.height ?? node.height;
        if (!oldW || !oldH || !change.dimensions?.width || !change.dimensions?.height) continue;

        const scaleX = change.dimensions.width / oldW;
        const scaleY = change.dimensions.height / oldH;

        const otherSelected = nodes.filter(n => n.selected && n.id !== change.id);
        if (otherSelected.length === 0) continue;

        // Use the resized node as anchor — other nodes move toward/away from it
        const anchorX = node.position.x;
        const anchorY = node.position.y;
        const otherIds = new Set(otherSelected.map(n => n.id));

        // Process the original resize changes for the dragged node
        onNodesChange(changes);

        // Directly update other selected nodes' dimensions and positions
        setNodes(nds => nds.map(n => {
          if (!otherIds.has(n.id)) return n;
          const ow = n.measured?.width ?? n.width;
          const oh = n.measured?.height ?? n.height;
          if (!ow || !oh) return n;

          const dx = n.position.x - anchorX;
          const dy = n.position.y - anchorY;

          return {
            ...n,
            width: ow * scaleX,
            height: oh * scaleY,
            position: {
              x: anchorX + dx * scaleX,
              y: anchorY + dy * scaleY,
            },
          };
        }));
        return;
      }
    }

    onNodesChange(changes);
  }, [nodes, getGenericIOData, extractLabelNumber, onNodesChange, setNodes]);

  // Sync settings across cascade-locked groups
  // The master node (lowest label number, with the lock button) controls settings for the group
  useEffect(() => {
    // Build lock groups: lockId -> nodes sorted by label number
    const lockGroups = new Map<string, Node[]>();

    nodes.forEach(node => {
      const data = getGenericIOData(node);
      if (data?.cascadeLockId) {
        const group = lockGroups.get(data.cascadeLockId) || [];
        group.push(node);
        lockGroups.set(data.cascadeLockId, group);
      }
    });

    // For each group, sync settings from master (first node) to all others
    let needsUpdate = false;
    const updatedNodes = [...nodes];

    lockGroups.forEach((groupNodes) => {
      if (groupNodes.length < 2) return;

      // Sort by label number - first node is the master
      const sortedGroup = groupNodes.sort((a, b) => {
        const dataA = getGenericIOData(a);
        const dataB = getGenericIOData(b);
        const numA = extractLabelNumber(dataA?.label || '');
        const numB = extractLabelNumber(dataB?.label || '');
        return numA - numB;
      });

      const masterNode = sortedGroup[0];
      const masterData = getGenericIOData(masterNode);
      if (!masterData) return;

      // Apply master's settings to all other nodes in the group
      for (let i = 1; i < sortedGroup.length; i++) {
        const followerNode = sortedGroup[i];
        const followerData = getGenericIOData(followerNode);
        if (!followerData) continue;

        // Check if settings differ from master
        if (followerData.color !== masterData.color || followerData.layout !== masterData.layout) {
          needsUpdate = true;
          const nodeIndex = updatedNodes.findIndex(n => n.id === followerNode.id);
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              data: {
                ...updatedNodes[nodeIndex].data,
                color: masterData.color,
                layout: masterData.layout,
              }
            };
          }
        }
      }
    });

    if (needsUpdate) {
      setNodes(updatedNodes);
    }
  }, [nodes, getGenericIOData, extractLabelNumber, setNodes]);

  // History tracking for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedo = useRef(false);
  const historyTimer = useRef<number | null>(null);

  // Track changes to nodes and edges for history with debouncing
  useEffect(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    // Clear existing timer
    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
    }

    // Debounce history updates to group rapid changes together
    historyTimer.current = setTimeout(() => {
      const newState = { nodes, edges };

      setHistory((prevHistory) => {
        const currentState = prevHistory[historyIndex];

        // Only add to history if something actually changed
        if (JSON.stringify(currentState) !== JSON.stringify(newState)) {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(newState);

          // Limit history to last 50 states
          if (newHistory.length > 51) {
            newHistory.shift();
            return newHistory;
          } else {
            setHistoryIndex(historyIndex + 1);
            return newHistory;
          }
        }
        return prevHistory;
      });
    }, 100); // 100ms debounce - captures distinct actions while grouping rapid updates

    return () => {
      if (historyTimer.current) {
        clearTimeout(historyTimer.current);
      }
    };
  }, [nodes, edges, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
      historyTimer.current = null;
    }

    setHistoryIndex((currentIndex) => {
      if (currentIndex > 0) {
        isUndoRedo.current = true;
        const newIndex = currentIndex - 1;
        const prevState = history[newIndex];
        setNodes(prevState.nodes);
        setEdges(prevState.edges);
        return newIndex;
      }
      return currentIndex;
    });
  }, [history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
      historyTimer.current = null;
    }

    setHistoryIndex((currentIndex) => {
      if (currentIndex < history.length - 1) {
        isUndoRedo.current = true;
        const newIndex = currentIndex + 1;
        const nextState = history[newIndex];
        setNodes(nextState.nodes);
        setEdges(nextState.edges);
        return newIndex;
      }
      return currentIndex;
    });
  }, [history, setNodes, setEdges]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (historyTimer.current) {
        clearTimeout(historyTimer.current);
      }
    };
  }, []);

  // Helper function to trace back to the original source color
  const getOriginalSourceColor = useCallback((nodeId: string, sourceHandleId?: string | null, visited: Set<string> = new Set()): string => {
    // Prevent infinite loops
    if (visited.has(nodeId)) return '#888';
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return '#888';

    // Check if this is a pass-through node (routing matrix, routers, or converters)
    const isPassThrough = node.type === 'switcher' || node.type === 'router';
    const label = (node.data?.label as string) || '';
    const labelLower = label.toLowerCase();

    // Detect routing matrices
    const isRoutingMatrix = labelLower.includes('20x20') ||
                           labelLower.includes('40x40') ||
                           labelLower.includes('router');

    // Detect converters (SDI/HDMI, 12G, Blackmagic converters, etc.)
    const isConverter = labelLower.includes('12g') ||
                       labelLower.includes('sdi') ||
                       labelLower.includes('hdmi') ||
                       labelLower.includes('converter') ||
                       labelLower.includes('bm ');

    // If it's a pass-through device (routing matrix or converter), always trace back to original source
    if ((isPassThrough && isRoutingMatrix) || isConverter) {
      // Check if this output has a source selected in the dropdown
      const outputs = (node.data?.outputs as Array<{ id?: string; destination?: string }>) || [];
      const outputPort = outputs.find(out =>
        `output-${out.id}` === sourceHandleId || out.id === sourceHandleId
      );

      if (outputPort?.destination) {
        // Find the source node by its label
        const sourceNode = nodes.find(n =>
          (n.data?.label as string) === outputPort.destination
        );
        if (sourceNode?.data?.color) {
          return sourceNode.data.color as string;
        }
      }

      // Also try tracing back through incoming connections
      const incomingEdges = edges.filter(e => e.target === nodeId);
      if (incomingEdges.length > 0) {
        // Try to find the original source color by tracing back
        for (const edge of incomingEdges) {
          const color = getOriginalSourceColor(edge.source, edge.sourceHandle, visited);
          if (color !== '#888') {
            return color;
          }
        }
        // If we have an incoming edge, use its color
        const firstEdge = incomingEdges[0];
        if (firstEdge.style?.stroke) {
          return firstEdge.style.stroke as string;
        }
      }
    }

    // Return this node's color (original source)
    return (node.data?.color as string) || '#888';
  }, [nodes, edges]);

  // Update edge colors when source node colors change
  // This effect runs whenever nodes change and checks if any edge colors need updating
  useEffect(() => {
    if (edges.length === 0) return;

    // Check each edge to see if its color matches what it should be
    let needsUpdate = false;
    const updatedEdges = edges.map(edge => {
      if (!edge.source) return edge;

      // Get the color this edge should have based on its source
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (!sourceNode) return edge;

      const expectedColor = getOriginalSourceColor(edge.source, edge.sourceHandle);
      const currentColor = edge.style?.stroke as string || '#888';

      if (expectedColor !== currentColor) {
        needsUpdate = true;
        return {
          ...edge,
          style: { ...edge.style, stroke: expectedColor, strokeWidth: 2 }
        };
      }
      return edge;
    });

    if (needsUpdate) {
      setEdges(updatedEdges);
    }
  }, [nodes, getOriginalSourceColor]);

  // Update converter node colors to match their input source
  // This makes pass-through devices visually show the source color
  useEffect(() => {
    if (edges.length === 0) return;

    let needsUpdate = false;
    const updatedNodes = nodes.map(node => {
      const label = (node.data?.label as string) || '';
      const labelLower = label.toLowerCase();

      // Check if this is a converter/pass-through device
      const isConverter = labelLower.includes('12g') ||
                         labelLower.includes('sdi') ||
                         labelLower.includes('hdmi') ||
                         labelLower.includes('converter') ||
                         labelLower.includes('bm ');

      if (!isConverter) return node;

      // Find incoming edges to this converter
      const incomingEdges = edges.filter(e => e.target === node.id);
      if (incomingEdges.length === 0) return node;

      // Get the source color from the first incoming connection
      const firstEdge = incomingEdges[0];
      const sourceNode = nodes.find(n => n.id === firstEdge.source);
      if (!sourceNode) return node;

      // Trace back to get the original source color
      const sourceColor = getOriginalSourceColor(firstEdge.source, firstEdge.sourceHandle);
      const currentColor = node.data?.color as string;

      // Update if different
      if (sourceColor && sourceColor !== '#888' && sourceColor !== currentColor) {
        needsUpdate = true;
        return {
          ...node,
          data: { ...node.data, color: sourceColor }
        };
      }
      return node;
    });

    if (needsUpdate) {
      setNodes(updatedNodes);
    }
  }, [edges, getOriginalSourceColor]);

  // State for pending new connection (to show editor modal)
  const [pendingConnection, setPendingConnection] = useState<{ params: Connection; edgeColor: string } | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      // Get color - trace back through pass-through nodes to find original source color
      const edgeColor = params.source ? getOriginalSourceColor(params.source, params.sourceHandle) : '#888';

      // Store the pending connection and show the editor modal
      setPendingConnection({ params, edgeColor });
    },
    [getOriginalSourceColor]
  );

  // Handle saving a new connection from the modal
  const handleSaveNewConnection = useCallback(
    (data: EdgeData) => {
      if (!pendingConnection) return;

      const { params, edgeColor } = pendingConnection;

      // Build label string that includes cable info if provided
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

      // Get source and target nodes for auto-fill
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      // Auto-fill connection names on source and target nodes

      if (sourceNode && targetNode) {
        const sourceHandleId = params.sourceHandle;
        const targetHandleId = params.targetHandle;

        // Get target node's label and input name for source's destination field
        const targetLabel = targetNode.data?.label || '';
        let targetInputName = '';

        // Find target input name based on node type
        if (targetNode.data?.inputs && Array.isArray(targetNode.data.inputs)) {
          const targetInput = targetNode.data.inputs.find(
            (inp: { id?: string; name?: string }) => inp.id === targetHandleId || `input-${inp.id}` === targetHandleId
          );
          if (targetInput) {
            targetInputName = targetInput.name || '';
          }
        }

        // Find target input name from BarcoE3 cards
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

        // Get source node's label and output name for target's source field
        const sourceLabel = sourceNode.data?.label || '';
        let sourceOutputName = '';

        // Find source output name based on node type
        if (sourceNode.data?.outputs && Array.isArray(sourceNode.data.outputs)) {
          const sourceOutput = sourceNode.data.outputs.find(
            (out: { id?: string; name?: string }) => out.id === sourceHandleId || `output-${out.id}` === sourceHandleId
          );
          if (sourceOutput) {
            sourceOutputName = sourceOutput.name || '';
          }
        }

        // Find source output name from BarcoE3 cards
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

        // Update nodes with connection info
        setNodes((nds) =>
          nds.map((node) => {
            // Update source node's output destination field
            // Skip for switcher nodes as they use 'destination' field for Source selection
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

            // Update BarcoE3 source node's output card connector destination field
            if (node.id === params.source && node.data?.cards && Array.isArray(node.data.cards)) {
              // Handle ID format for BarcoE3: "output-{cardId}-{connectorId}"
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

            // Update target node's input source field
            if (node.id === params.target && node.data?.inputs && Array.isArray(node.data.inputs)) {
              const updatedInputs = (node.data.inputs as Array<{ id?: string; source?: string; connection?: string }>).map(
                (inp) => {
                  if (inp.id === targetHandleId || `input-${inp.id}` === targetHandleId) {
                    // For switcher/processor nodes, update 'connection' field (displays as SOURCE)
                    if ('connection' in inp) {
                      return { ...inp, connection: sourceLabel };
                    }
                    // For genericIO and similar nodes, update 'source' field
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

            // Update BarcoE3 node's input card connector source field
            if (node.id === params.target && node.data?.cards && Array.isArray(node.data.cards)) {
              // Handle ID format for BarcoE3: "input-{cardId}-{connectorId}"
              const handleParts = targetHandleId?.split('-') || [];
              if (handleParts.length >= 3 && handleParts[0] === 'input') {
                const cardId = handleParts[1];
                const connectorId = handleParts.slice(2).join('-'); // Handle connector IDs that might have dashes

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

  // Handle cancelling a new connection
  const handleCancelNewConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

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
      if (historyTimer.current) {
        clearTimeout(historyTimer.current);
        historyTimer.current = null;
      }
      isUndoRedo.current = true;
      setNodes(project.nodes);
      setEdges(project.edges);
      setProjectName(project.name);
      setProjectId(project.id);
      // Reset history when loading a project
      setHistory([{ nodes: project.nodes, edges: project.edges }]);
      setHistoryIndex(0);
      // Reset copied nodes
      setCopiedNodes([]);
      copiedNodesRef.current = [];
    },
    [setNodes, setEdges]
  );

  const onNewProject = useCallback(() => {
    if (nodes.length > 0 && !confirm('Create new project? Unsaved changes will be lost.')) {
      return;
    }
    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
      historyTimer.current = null;
    }
    isUndoRedo.current = true;
    setNodes([]);
    setEdges([]);
    setProjectName('Untitled Project');
    setProjectId(uuidv4());
    // Reset history when creating a new project
    setHistory([{ nodes: [], edges: [] }]);
    setHistoryIndex(0);
    // Reset copied nodes
    setCopiedNodes([]);
    copiedNodesRef.current = [];
    // Re-center the page
    centerPage();
  }, [nodes.length, setNodes, setEdges, centerPage]);

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Check if multiple edges are selected
      const selectedEdges = edges.filter(e => e.selected);
      if (selectedEdges.length > 1) {
        // Multiple edges selected - open style editor
        setSelectedEdgeIds(selectedEdges.map(e => e.id));
        setShowEdgeStyleEditor(true);
      } else {
        // Single edge - open label editor
        setEditingEdge(edge);
      }
    },
    [edges]
  );

  // Handle applying styles to selected edges
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

  // Get current style options from selected edges (use first edge's values as defaults)
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
        // Build label string that includes cable info if provided
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

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();

      // Get all selected nodes (including the one that was right-clicked)
      const selectedNodes = nodes.filter(n => n.selected || n.id === node.id);
      const nodeIds = selectedNodes.map(n => n.id);

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeIds,
      });
    },
    [nodes]
  );

  const handleDuplicateNodes = useCallback(() => {
    if (!contextMenu) return;

    const nodesToDuplicate = nodes.filter(n => contextMenu.nodeIds.includes(n.id));
    const newNodes: Node[] = [];
    const oldToNewIdMap = new Map<string, string>();

    // Create new nodes with offset positions
    nodesToDuplicate.forEach((node) => {
      const newId = uuidv4();
      oldToNewIdMap.set(node.id, newId);

      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
        data: { ...node.data },
      };
      newNodes.push(newNode);
    });

    // Add new nodes
    setNodes((nds) => [...nds, ...newNodes]);

    // Duplicate edges that connect duplicated nodes
    const newEdges: Edge[] = [];
    edges.forEach((edge) => {
      const sourceInDuplicated = oldToNewIdMap.has(edge.source);
      const targetInDuplicated = oldToNewIdMap.has(edge.target);

      // Only duplicate edge if both source and target are in the duplicated set
      if (sourceInDuplicated && targetInDuplicated) {
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

  const handleCopy = useCallback(() => {
    // Get current nodes from ReactFlow to ensure we have latest selection state
    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter(n => n.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
      copiedNodesRef.current = selectedNodes;
      console.log('Copied', selectedNodes.length, 'nodes'); // Debug
    } else {
      console.log('No nodes selected to copy'); // Debug
    }
  }, [getNodes]);

  const handlePaste = useCallback(() => {
    const currentCopiedNodes = copiedNodesRef.current;
    console.log('Paste triggered, copied nodes:', currentCopiedNodes.length); // Debug
    if (currentCopiedNodes.length === 0) return;

    // Helper function to increment label numbers
    const incrementLabel = (label: string): string => {
      // Match number at the end of string (e.g., "Camera 1", "Switcher 23")
      const match = label.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1].trim();
        const number = parseInt(match[2]);
        return `${prefix} ${number + 1}`;
      }
      // No number found, add " 1" to the end
      return `${label} 1`;
    };

    const newNodes: Node[] = [];
    const oldToNewIdMap = new Map<string, string>();

    // Calculate offset based on cascade direction
    const xOffset = cascadeDirectionRef.current === 'right' ? 50 : -50;
    const yOffset = 50;

    // Create new nodes with offset positions
    currentCopiedNodes.forEach((node) => {
      const newId = uuidv4();
      oldToNewIdMap.set(node.id, newId);

      // Increment label if it exists
      const currentLabel = typeof node.data?.label === 'string' ? node.data.label : '';
      const newLabel = currentLabel ? incrementLabel(currentLabel) : currentLabel;

      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + xOffset,
          y: node.position.y + yOffset,
        },
        selected: true,
        data: {
          ...node.data,
          label: newLabel
        },
      };
      newNodes.push(newNode);
    });

    // Deselect all current nodes
    setNodes((nds) => [
      ...nds.map(n => ({ ...n, selected: false })),
      ...newNodes
    ]);

    // Duplicate edges that connect pasted nodes
    const newEdges: Edge[] = [];
    edgesRef.current.forEach((edge) => {
      const sourceInCopied = oldToNewIdMap.has(edge.source);
      const targetInCopied = oldToNewIdMap.has(edge.target);

      // Only duplicate edge if both source and target are in the copied set
      if (sourceInCopied && targetInCopied) {
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

    // Update copied nodes positions for next paste
    setCopiedNodes(newNodes);
    copiedNodesRef.current = newNodes;
  }, [setNodes, setEdges]);

  // Keyboard shortcuts for undo/redo, copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target?.tagName?.toUpperCase() || '';
      const isInInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';

      // Undo - Ctrl+Z
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        handleUndo();
        return;
      }

      // Redo - Ctrl+Y or Ctrl+Shift+Z
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault();
        event.stopPropagation();
        handleRedo();
        return;
      }

      // Skip copy/paste if typing in input
      if (isInInput) return;

      // Copy - Ctrl+C
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        event.stopPropagation();
        handleCopy();
        return;
      }

      // Paste - Ctrl+V
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        event.stopPropagation();
        handlePaste();
        return;
      }
    };

    // Attach to window with capture to intercept before anything else
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleUndo, handleRedo, handleCopy, handlePaste]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Check for saved preset data first
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

      // Handle image file drops
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

  const handleExportPNG = useCallback(() => {
    const nodesList = getNodes();

    if (nodesList.length === 0) {
      alert('No nodes to export. Add some nodes first.');
      return;
    }

    // Get bounds of all nodes
    const nodesBounds = getNodesBounds(nodesList);

    // Add padding around the bounds
    const padding = 100;
    const paddedBounds = {
      x: nodesBounds.x - padding,
      y: nodesBounds.y - padding,
      width: nodesBounds.width + padding * 2,
      height: nodesBounds.height + padding * 2,
    };

    // Calculate dimensions - use higher resolution for better quality
    const scaleFactor = 2; // 2x resolution for crisp text
    const aspectRatio = paddedBounds.width / paddedBounds.height;

    // Set minimum dimensions but scale based on content
    let exportWidth = Math.max(1920, paddedBounds.width);
    let exportHeight = exportWidth / aspectRatio;

    // Ensure minimum height
    if (exportHeight < 1080) {
      exportHeight = 1080;
      exportWidth = exportHeight * aspectRatio;
    }

    // Apply scale factor for better quality
    const finalWidth = exportWidth * scaleFactor;
    const finalHeight = exportHeight * scaleFactor;

    // Calculate viewport to fit all nodes
    const viewport = getViewportForBounds(
      paddedBounds,
      finalWidth,
      finalHeight,
      0.1,  // minZoom
      4,    // maxZoom
      0     // padding (already added above)
    );

    // Export to PNG with high quality
    toPng(document.querySelector('.react-flow') as HTMLElement, {
      backgroundColor: '#1a1a2e',
      width: finalWidth,
      height: finalHeight,
      pixelRatio: scaleFactor,
      style: {
        width: `${finalWidth}px`,
        height: `${finalHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl: string) => {
      const a = document.createElement('a');
      a.setAttribute('download', `${projectName.replace(/\s+/g, '_')}.png`);
      a.setAttribute('href', dataUrl);
      a.click();
    }).catch((error: Error) => {
      console.error('Export failed:', error);
      alert('Failed to export PNG. Please try again.');
    });
  }, [getNodes, projectName]);

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
