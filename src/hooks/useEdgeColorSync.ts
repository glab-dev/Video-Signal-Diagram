import { useCallback, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface UseEdgeColorSyncParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export function useEdgeColorSync({ nodes, edges, setNodes, setEdges }: UseEdgeColorSyncParams) {
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
  useEffect(() => {
    if (edges.length === 0) return;

    let needsUpdate = false;
    const updatedEdges = edges.map(edge => {
      if (!edge.source) return edge;

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
  useEffect(() => {
    if (edges.length === 0) return;

    let needsUpdate = false;
    const updatedNodes = nodes.map(node => {
      const label = (node.data?.label as string) || '';
      const labelLower = label.toLowerCase();

      const isConverter = labelLower.includes('12g') ||
                         labelLower.includes('sdi') ||
                         labelLower.includes('hdmi') ||
                         labelLower.includes('converter') ||
                         labelLower.includes('bm ');

      if (!isConverter) return node;

      const incomingEdges = edges.filter(e => e.target === node.id);
      if (incomingEdges.length === 0) return node;

      const firstEdge = incomingEdges[0];
      const sourceNode = nodes.find(n => n.id === firstEdge.source);
      if (!sourceNode) return node;

      const sourceColor = getOriginalSourceColor(firstEdge.source, firstEdge.sourceHandle);
      const currentColor = node.data?.color as string;

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

  return { getOriginalSourceColor };
}
