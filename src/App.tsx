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
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { nodeTypes } from './components/nodes';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification';
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // History tracking for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedo = useRef(false);

  // Track changes to nodes and edges for history
  useEffect(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    const newState = { nodes, edges };
    const currentState = history[historyIndex];

    // Only add to history if something actually changed
    if (JSON.stringify(currentState) !== JSON.stringify(newState)) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      // Limit history to last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      setHistory(newHistory);
    }
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
    },
    [setEdges]
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
      setNodes(project.nodes);
      setEdges(project.edges);
      setProjectName(project.name);
      setProjectId(project.id);
    },
    [setNodes, setEdges]
  );

  const onNewProject = useCallback(() => {
    if (nodes.length > 0 && !confirm('Create new project? Unsaved changes will be lost.')) {
      return;
    }
    setNodes([]);
    setEdges([]);
    setProjectName('Untitled Project');
    setProjectId(uuidv4());
  }, [nodes.length, setNodes, setEdges]);

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const newLabel = prompt('Edit connection label:', (edge.label as string) || '');
      if (newLabel !== null) {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === edge.id
              ? { ...e, label: newLabel || undefined }
              : e
          )
        );
      }
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

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
