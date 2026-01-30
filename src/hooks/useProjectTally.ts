import { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';

interface EdgeData {
  cableType?: string;
  cableLength?: string;
}

export interface TallyItem {
  id: string;
  name: string;
  type?: string;
  details?: string;
}

export interface CableItem {
  id: string;
  cableType: string;
  cableLength: string;
  count: number;
}

export interface ProjectTallyCategory {
  id: string;
  label: string;
  items: TallyItem[];
  order: number;
}

export interface ProjectTally {
  categories: ProjectTallyCategory[];
  cables: CableItem[];
  totalNodes: number;
  totalCables: number;
}

// Categorize node by type
function categorizeNode(node: Node): string {
  const nodeType = node.type || '';
  const label = ((node.data?.label as string) || '').toLowerCase();

  // Check for specific equipment types based on label or node type
  if (nodeType === 'router' || label.includes('router') || label.includes('20x20') || label.includes('40x40')) {
    return 'switchers';
  }

  if (nodeType === 'processor' || nodeType === 'barcoE3' ||
      label.includes('e2') || label.includes('e3') || label.includes('brompton') ||
      label.includes('sx40') || label.includes('s8') || label.includes('m2') ||
      label.includes('atem') || label.includes('processor')) {
    return 'processors';
  }

  if (label.includes('mac') || label.includes('laptop') || label.includes('camera') ||
      label.includes('media server') || label.includes('ndi') || label.includes('source') ||
      label.includes('ptz') || label.includes('srt')) {
    return 'sources';
  }

  if (nodeType === 'ledWall' || label.includes('led') || label.includes('monitor') ||
      label.includes('projector') || label.includes('recorder') || label.includes('destination')) {
    return 'destinations';
  }

  if (nodeType === 'card') {
    return 'cards';
  }

  if (nodeType === 'note') {
    return 'notes';
  }

  if (nodeType === 'image') {
    return 'images';
  }

  // Check for converters/pass-through devices
  if (label.includes('12g') || label.includes('sdi') || label.includes('hdmi') ||
      label.includes('converter') || label.includes('bm ')) {
    return 'converters';
  }

  return 'other';
}

const CATEGORY_CONFIG: Record<string, { label: string; defaultOrder: number }> = {
  sources: { label: 'Sources', defaultOrder: 0 },
  processors: { label: 'Processors', defaultOrder: 1 },
  switchers: { label: 'Switchers & Routers', defaultOrder: 2 },
  converters: { label: 'Converters', defaultOrder: 3 },
  destinations: { label: 'Destinations', defaultOrder: 4 },
  cards: { label: 'Cards', defaultOrder: 5 },
  notes: { label: 'Notes', defaultOrder: 6 },
  images: { label: 'Images', defaultOrder: 7 },
  other: { label: 'Other Equipment', defaultOrder: 8 },
};

export function useProjectTally(
  nodes: Node[],
  edges: Edge[],
  categoryOrder?: string[]
): ProjectTally {
  return useMemo(() => {
    // Group nodes by category
    const categoryMap = new Map<string, TallyItem[]>();

    nodes.forEach(node => {
      // Skip if no label
      const label = (node.data?.label as string) || '';
      if (!label) return;

      const category = categorizeNode(node);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }

      const item: TallyItem = {
        id: node.id,
        name: label,
        type: node.type,
        details: (node.data?.ipAddress as string) || undefined,
      };

      categoryMap.get(category)!.push(item);
    });

    // Build categories with order
    const categories: ProjectTallyCategory[] = [];
    const order = categoryOrder || Object.keys(CATEGORY_CONFIG);

    categoryMap.forEach((items, categoryId) => {
      const config = CATEGORY_CONFIG[categoryId] || { label: categoryId, defaultOrder: 99 };
      const orderIndex = order.indexOf(categoryId);

      categories.push({
        id: categoryId,
        label: config.label,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
        order: orderIndex >= 0 ? orderIndex : config.defaultOrder,
      });
    });

    // Sort categories by order
    categories.sort((a, b) => a.order - b.order);

    // Aggregate cables from edges
    const cableMap = new Map<string, CableItem>();

    edges.forEach(edge => {
      const data = edge.data as EdgeData | undefined;
      const cableType = data?.cableType || '';
      const cableLength = data?.cableLength || '';

      // Skip edges without cable info
      if (!cableType && !cableLength) return;

      const key = `${cableType}|${cableLength}`;

      if (cableMap.has(key)) {
        cableMap.get(key)!.count++;
      } else {
        cableMap.set(key, {
          id: key,
          cableType: cableType || 'Unspecified',
          cableLength: cableLength || 'Unspecified',
          count: 1,
        });
      }
    });

    // Sort cables by type then length
    const cables = Array.from(cableMap.values()).sort((a, b) => {
      if (a.cableType !== b.cableType) {
        return a.cableType.localeCompare(b.cableType);
      }
      return a.cableLength.localeCompare(b.cableLength);
    });

    return {
      categories,
      cables,
      totalNodes: nodes.filter(n => n.data?.label).length,
      totalCables: cables.reduce((sum, c) => sum + c.count, 0),
    };
  }, [nodes, edges, categoryOrder]);
}

// Generate text format for email/clipboard
export function formatProjectTallyText(tally: ProjectTally, projectName?: string): string {
  const lines: string[] = [];

  lines.push('PROJECT TALLY');
  if (projectName) {
    lines.push(`Project: ${projectName}`);
  }
  lines.push('='.repeat(40));
  lines.push('');

  // Equipment by category
  tally.categories.forEach(category => {
    if (category.items.length === 0) return;

    lines.push(category.label.toUpperCase());
    lines.push('-'.repeat(category.label.length));

    category.items.forEach(item => {
      let line = `  - ${item.name}`;
      if (item.details) {
        line += ` (${item.details})`;
      }
      lines.push(line);
    });

    lines.push('');
  });

  // Cables
  if (tally.cables.length > 0) {
    lines.push('CABLES');
    lines.push('------');

    tally.cables.forEach(cable => {
      lines.push(`  - ${cable.cableType} ${cable.cableLength}: x${cable.count}`);
    });

    lines.push('');
  }

  // Summary
  lines.push('='.repeat(40));
  lines.push(`Total Equipment: ${tally.totalNodes}`);
  lines.push(`Total Cables: ${tally.totalCables}`);

  return lines.join('\n');
}
