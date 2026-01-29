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
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { toPng } from 'html-to-image';

import { nodeTypes } from './components/nodes';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification';
import EdgeLabelEditor from './components/EdgeLabelEditor';
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes } = useReactFlow();

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

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const onConnect = useCallback(
    (params: Connection) => {
      const label = prompt('Connection label (optional):') || '';
      const edge: Edge = {
        ...params,
        id: uuidv4(),
        type: 'default',
        style: { stroke: '#888', strokeWidth: 2 },
        label: label || undefined,
        labelStyle: { fill: '#fff', fontWeight: 600 },
        labelBgStyle: { fill: '#333', fillOpacity: 0.8 },
        labelBgPadding: [4, 8] as [number, number],
      } as Edge;
      setEdges((eds) => addEdge(edge, eds));

      // Auto-fill connection names on source and target nodes
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

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
    },
    [setEdges, nodes, setNodes]
  );

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
  }, [nodes.length, setNodes, setEdges]);

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setEditingEdge(edge);
    },
    []
  );

  const handleSaveEdgeLabel = useCallback(
    (label: string) => {
      if (editingEdge) {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === editingEdge.id
              ? { ...e, label: label || undefined }
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

    // Calculate viewport to fit all nodes with padding
    const viewport = getViewportForBounds(
      nodesBounds,
      1920, // width
      1080, // height
      0.5,  // minZoom
      2,    // maxZoom
      0.1   // padding
    );

    // Export to PNG with high quality
    toPng(document.querySelector('.react-flow') as HTMLElement, {
      backgroundColor: '#1a1a2e',
      width: 1920,
      height: 1080,
      style: {
        width: '1920px',
        height: '1080px',
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
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
          snapToGrid
          snapGrid={[10, 10]}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode={['Shift', 'Meta']}
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
          initialLabel={(editingEdge.label as string) || ''}
          onSave={handleSaveEdgeLabel}
          onDeleteLabel={handleDeleteEdgeLabel}
          onDeleteConnection={handleDeleteConnection}
          onCancel={handleCancelEdgeEdit}
        />
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
