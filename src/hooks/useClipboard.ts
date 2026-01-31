import { useCallback, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node, Edge } from '@xyflow/react';

interface UseClipboardParams {
  getNodes: () => Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  edgesRef: React.MutableRefObject<Edge[]>;
  cascadeDirectionRef: React.MutableRefObject<'right' | 'left'>;
}

export function useClipboard({ getNodes, setNodes, setEdges, edgesRef, cascadeDirectionRef }: UseClipboardParams) {
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const copiedNodesRef = useRef<Node[]>([]);

  const handleCopy = useCallback(() => {
    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter(n => n.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
      copiedNodesRef.current = selectedNodes;
    }
  }, [getNodes]);

  const handlePaste = useCallback(() => {
    const currentCopiedNodes = copiedNodesRef.current;
    if (currentCopiedNodes.length === 0) return;

    // Helper function to increment label numbers
    const incrementLabel = (label: string): string => {
      const match = label.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1].trim();
        const number = parseInt(match[2]);
        return `${prefix} ${number + 1}`;
      }
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
  }, [setNodes, setEdges, edgesRef, cascadeDirectionRef]);

  const resetCopiedNodes = useCallback(() => {
    setCopiedNodes([]);
    copiedNodesRef.current = [];
  }, []);

  return {
    copiedNodes,
    copiedNodesRef,
    handleCopy,
    handlePaste,
    resetCopiedNodes,
  };
}
