import { useCallback, useState, useRef, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface UseHistoryParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export function useHistory({ nodes, edges, setNodes, setEdges }: UseHistoryParams) {
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedo = useRef(false);
  const historyTimer = useRef<number | null>(null);

  // Track changes to nodes and edges for history with debouncing
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

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
      const currentIndex = historyIndexRef.current;

      setHistory((prevHistory) => {
        const currentState = prevHistory[currentIndex];

        // Only add to history if something actually changed
        if (JSON.stringify(currentState) !== JSON.stringify(newState)) {
          const newHistory = prevHistory.slice(0, currentIndex + 1);
          newHistory.push(newState);

          // Limit history to last 50 states
          if (newHistory.length > 51) {
            newHistory.shift();
            return newHistory;
          } else {
            setHistoryIndex(currentIndex + 1);
            return newHistory;
          }
        }
        return prevHistory;
      });
    }, 100) as unknown as number;

    return () => {
      if (historyTimer.current) {
        clearTimeout(historyTimer.current);
      }
    };
  }, [nodes, edges]);

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

  // Reset history (for load/new project)
  const resetHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
      historyTimer.current = null;
    }
    isUndoRedo.current = true;
    setHistory([{ nodes: newNodes, edges: newEdges }]);
    setHistoryIndex(0);
  }, []);

  return {
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    isUndoRedo,
    historyTimer,
    resetHistory,
  };
}
