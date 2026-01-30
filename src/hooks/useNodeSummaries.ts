import { createContext, useContext } from 'react';
import { useStore } from '@xyflow/react';

/**
 * Lightweight summary of a node - contains only the data needed
 * to compute source/destination name lists for dropdowns.
 *
 * By using useStore with a custom equality function, this hook
 * does NOT trigger re-renders when nodes are dragged, resized,
 * or selected — only when labels, types, or port counts change.
 */
export interface NodeSummary {
  id: string;
  type: string;
  label: string;
  hasOutputs: boolean;
  hasInputs: boolean;
  hasRows: boolean;
  hasOutputCards: boolean;
  hasInputCards: boolean;
  hasOutputConnectors: boolean;
  hasInputConnectors: boolean;
}

function summariesEqual(a: NodeSummary[], b: NodeSummary[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const sa = a[i], sb = b[i];
    if (
      sa.id !== sb.id ||
      sa.type !== sb.type ||
      sa.label !== sb.label ||
      sa.hasOutputs !== sb.hasOutputs ||
      sa.hasInputs !== sb.hasInputs ||
      sa.hasRows !== sb.hasRows ||
      sa.hasOutputCards !== sb.hasOutputCards ||
      sa.hasInputCards !== sb.hasInputCards ||
      sa.hasOutputConnectors !== sb.hasOutputConnectors ||
      sa.hasInputConnectors !== sb.hasInputConnectors
    ) {
      return false;
    }
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

export function useNodeSummaries(): NodeSummary[] {
  return useStore(
    (state) =>
      state.nodes.map((node) => {
        const data = (node.data || {}) as AnyData;
        const cards = Array.isArray(data.cards) ? data.cards : null;
        const connectors = Array.isArray(data.connectors) ? data.connectors : null;

        return {
          id: node.id,
          type: node.type || '',
          label: (data.label as string) || '',
          hasOutputs: Array.isArray(data.outputs) && data.outputs.length > 0,
          hasInputs: Array.isArray(data.inputs) && data.inputs.length > 0,
          hasRows: Array.isArray(data.rows) && data.rows.length > 0,
          hasOutputCards: cards !== null && cards.some((c: AnyData) => c.cardType === 'output' || c.cardType === 'system'),
          hasInputCards: cards !== null && cards.some((c: AnyData) => c.cardType === 'input'),
          hasOutputConnectors: connectors !== null && connectors.some((c: AnyData) => c.destination !== undefined),
          hasInputConnectors: connectors !== null && connectors.some((c: AnyData) => c.source !== undefined),
        };
      }),
    summariesEqual
  );
}

// Context for sharing summaries from a single useNodeSummaries call
export const NodeSummariesContext = createContext<NodeSummary[]>([]);

/** Consume summaries from the nearest provider (no store subscription). */
export function useNodeSummariesContext(): NodeSummary[] {
  return useContext(NodeSummariesContext);
}
