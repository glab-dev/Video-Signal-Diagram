import { useMemo } from 'react';
import type { Node } from '@xyflow/react';

export interface PageDescriptor {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface UsePageGridOptions {
  nodes: Node[];
  pageWidth: number;
  pageHeight: number;
}

export function usePageGrid({ nodes, pageWidth, pageHeight }: UsePageGridOptions): PageDescriptor[] {
  return useMemo(() => {
    const occupied = new Set<string>();

    // Always include the origin page
    occupied.add('0,0');

    // For each node, determine which page cells it overlaps
    for (const node of nodes) {
      const left = node.position.x;
      const top = node.position.y;
      const w = node.measured?.width ?? 200;
      const h = node.measured?.height ?? 100;
      const right = left + w;
      const bottom = top + h;

      const colStart = Math.floor(left / pageWidth);
      const colEnd = Math.floor((right - 1) / pageWidth);
      const rowStart = Math.floor(top / pageHeight);
      const rowEnd = Math.floor((bottom - 1) / pageHeight);

      for (let col = colStart; col <= colEnd; col++) {
        for (let row = rowStart; row <= rowEnd; row++) {
          occupied.add(`${col},${row}`);
        }
      }
    }

    // Convert Set to sorted array of PageDescriptors
    const pages: PageDescriptor[] = [];
    for (const key of occupied) {
      const [col, row] = key.split(',').map(Number);
      pages.push({
        col,
        row,
        x: col * pageWidth,
        y: row * pageHeight,
        width: pageWidth,
        height: pageHeight,
        label: '', // assigned below after sorting
      });
    }

    // Sort: top-to-bottom, then left-to-right
    pages.sort((a, b) => a.row - b.row || a.col - b.col);

    // Assign sequential labels
    pages.forEach((p, i) => {
      p.label = `Page ${i + 1}`;
    });

    return pages;
  }, [nodes, pageWidth, pageHeight]);
}
