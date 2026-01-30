import { useMemo } from 'react';
import type { Edge } from '@xyflow/react';
import type { CableTally, CableTallyItem } from '../types';

interface EdgeData {
  cableType?: string;
  cableLength?: string;
}

export function useCableTally(edges: Edge[]): CableTally {
  return useMemo(() => {
    const tallyMap = new Map<string, CableTallyItem>();

    edges.forEach(edge => {
      const data = edge.data as EdgeData | undefined;
      const cableType = data?.cableType || '';
      const cableLength = data?.cableLength || '';

      // Skip edges without cable info
      if (!cableType && !cableLength) return;

      const key = `${cableType}|${cableLength}`;

      if (tallyMap.has(key)) {
        const item = tallyMap.get(key)!;
        item.count++;
      } else {
        tallyMap.set(key, {
          cableType: cableType || 'Unspecified',
          cableLength: cableLength || 'Unspecified',
          count: 1,
        });
      }
    });

    // Sort by cable type, then by length
    const items = Array.from(tallyMap.values()).sort((a, b) => {
      if (a.cableType !== b.cableType) {
        return a.cableType.localeCompare(b.cableType);
      }
      return a.cableLength.localeCompare(b.cableLength);
    });

    return {
      items,
      totalCables: items.reduce((sum, item) => sum + item.count, 0),
    };
  }, [edges]);
}
