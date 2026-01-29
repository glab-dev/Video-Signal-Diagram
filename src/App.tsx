import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  SelectionMode,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { toPng } from 'html-to-image';

import { nodeTypes } from './components/nodes';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification';
import EdgeLabelEditor from './components/EdgeLabelEditor';
import type { EdgeData } from './components/EdgeLabelEditor';
import type { ProjectData } from './types';
import './App.css';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeIds: string[] } | null>(null);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [cascadeDirection, setCascadeDirection] = useState<'right' | 'left'>('right');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes } = useReactFlow();

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

    // Check if this is a pass-through node (routing matrix like 20x20, 40x40, or routers)
    const isPassThrough = node.type === 'switcher' || node.type === 'router';
    const label = (node.data?.label as string) || '';
    const isRoutingMatrix = label.toLowerCase().includes('20x20') ||
                           label.toLowerCase().includes('40x40') ||
                           label.toLowerCase().includes('router');

    // If it's a pass-through routing device, check the output's selected source
    if (isPassThrough && isRoutingMatrix && sourceHandleId) {
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
        type: 'default',
        style: { stroke: edgeColor, strokeWidth: 2 },
        label: displayLabel || undefined,
        labelStyle: { fill: '#fff', fontWeight: 600 },
        labelBgStyle: { fill: '#333', fillOpacity: 0.8 },
        labelBgPadding: [4, 8] as [number, number],
        data: {
          cableType: data.cableType,
          cableLength: data.cableLength,
          rawLabel: data.label,
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

        // Update nodes with connection info
        setNodes((nds) =>
          nds.map((node) => {
            // Update source node's output destination field
            if (node.id === params.source && node.data?.outputs && Array.isArray(node.data.outputs)) {
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
  }, [nodes.length, setNodes, setEdges]);

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setEditingEdge(edge);
    },
    []
  );

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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
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
          minZoom={0.1}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
          <Controls />
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
          <Panel position="top-left" className="project-panel">
            <input
              className="project-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project Name"
            />
          </Panel>
        </ReactFlow>
      </div>

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
