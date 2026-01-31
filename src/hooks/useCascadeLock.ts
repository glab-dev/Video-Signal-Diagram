import { useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node } from '@xyflow/react';
import type { GenericIONodeData } from '../types';
import type { CascadeLockContextType } from '../contexts/CascadeLockContext';

// Helper to extract number from end of label (e.g., "Camera 1" -> 1)
export function extractLabelNumber(label: string): number {
  const match = label.match(/(\d+)\s*$/);
  return match ? parseInt(match[1]) : 0;
}

// Helper to get base label without number (e.g., "Camera 1" -> "Camera")
function getBaseLabel(label: string): string {
  return label.replace(/\s*\d+\s*$/, '').trim();
}

// Helper to safely cast node data
export function getGenericIOData(node: Node): GenericIONodeData | null {
  if (node.type !== 'genericIO') return null;
  return node.data as unknown as GenericIONodeData;
}

interface UseCascadeLockParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function useCascadeLock({ nodes, setNodes }: UseCascadeLockParams): CascadeLockContextType {
  // Detect cascade groups - GenericIO nodes with same base label, arranged vertically
  const detectCascadeGroup = useCallback((nodeId: string): string[] => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];

    const nodeData = getGenericIOData(node);
    if (!nodeData) return [];

    const baseLabel = getBaseLabel(nodeData.label || '');
    if (!baseLabel) return [];

    // Find all GenericIO nodes with the same base label
    const sameLabelNodes = nodes.filter(n => {
      const data = getGenericIOData(n);
      if (!data) return false;
      return getBaseLabel(data.label || '') === baseLabel;
    });

    // Need at least 2 nodes with the same base label
    if (sameLabelNodes.length < 2) return [];

    // Check if the x positions span a reasonable range (allows staircase arrangements)
    const xPositions = sameLabelNodes.map(n => n.position.x);
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const MAX_SPREAD_PER_NODE = 100;
    const maxSpread = Math.max(400, sameLabelNodes.length * MAX_SPREAD_PER_NODE);

    if (maxX - minX > maxSpread) return [];

    // Sort by label number, then by y position
    return sameLabelNodes
      .sort((a, b) => {
        const dataA = getGenericIOData(a);
        const dataB = getGenericIOData(b);
        const numA = extractLabelNumber(dataA?.label || '');
        const numB = extractLabelNumber(dataB?.label || '');
        if (numA !== numB) return numA - numB;
        return a.position.y - b.position.y;
      })
      .map(n => n.id);
  }, [nodes]);

  // Get cascade group info for a node
  const getCascadeGroup = useCallback((nodeId: string): { isLocked: boolean; isFirstInGroup: boolean; groupNodes: string[] } => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { isLocked: false, isFirstInGroup: false, groupNodes: [] };

    const nodeData = getGenericIOData(node);
    if (!nodeData) return { isLocked: false, isFirstInGroup: false, groupNodes: [] };

    // Check if this node is part of a locked cascade
    const cascadeLockId = nodeData.cascadeLockId;
    if (cascadeLockId) {
      const groupNodes = nodes
        .filter(n => {
          const data = getGenericIOData(n);
          return data?.cascadeLockId === cascadeLockId;
        })
        .sort((a, b) => {
          const dataA = getGenericIOData(a);
          const dataB = getGenericIOData(b);
          const numA = extractLabelNumber(dataA?.label || '');
          const numB = extractLabelNumber(dataB?.label || '');
          if (numA !== numB) return numA - numB;
          return a.position.y - b.position.y;
        })
        .map(n => n.id);
      const isFirstInGroup = groupNodes[0] === nodeId;
      return { isLocked: true, isFirstInGroup, groupNodes };
    }

    // Not locked - detect potential cascade group
    const potentialGroup = detectCascadeGroup(nodeId);
    if (potentialGroup.length >= 2) {
      const isFirstInGroup = potentialGroup[0] === nodeId;
      return { isLocked: false, isFirstInGroup, groupNodes: potentialGroup };
    }

    return { isLocked: false, isFirstInGroup: false, groupNodes: [] };
  }, [nodes, detectCascadeGroup]);

  // Toggle cascade lock for a group
  const toggleCascadeLock = useCallback((nodeId: string) => {
    const cascadeInfo = getCascadeGroup(nodeId);
    if (cascadeInfo.groupNodes.length < 2) return;

    if (cascadeInfo.isLocked) {
      // Unlock - remove cascadeLockId from all nodes in group
      setNodes(nds => nds.map(n => {
        if (cascadeInfo.groupNodes.includes(n.id)) {
          const { cascadeLockId: _, ...restData } = n.data as unknown as GenericIONodeData;
          void _;
          return { ...n, data: restData };
        }
        return n;
      }));
    } else {
      // Lock - add same cascadeLockId to all nodes in group
      const newLockId = uuidv4();
      setNodes(nds => nds.map(n => {
        if (cascadeInfo.groupNodes.includes(n.id)) {
          return {
            ...n,
            data: { ...n.data, cascadeLockId: newLockId }
          };
        }
        return n;
      }));
    }
  }, [getCascadeGroup, setNodes]);

  // Sync settings across cascade-locked groups
  useEffect(() => {
    const lockGroups = new Map<string, Node[]>();

    for (const node of nodes) {
      const data = getGenericIOData(node);
      if (data?.cascadeLockId) {
        const group = lockGroups.get(data.cascadeLockId) || [];
        group.push(node);
        lockGroups.set(data.cascadeLockId, group);
      }
    }

    if (lockGroups.size === 0) return;

    const updates = new Map<string, { color: string; layout: string }>();

    lockGroups.forEach((groupNodes) => {
      if (groupNodes.length < 2) return;

      const sortedGroup = groupNodes.sort((a, b) => {
        const dataA = getGenericIOData(a);
        const dataB = getGenericIOData(b);
        const numA = extractLabelNumber(dataA?.label || '');
        const numB = extractLabelNumber(dataB?.label || '');
        return numA - numB;
      });

      const masterData = getGenericIOData(sortedGroup[0]);
      if (!masterData) return;

      for (let i = 1; i < sortedGroup.length; i++) {
        const followerData = getGenericIOData(sortedGroup[i]);
        if (!followerData) continue;

        if (followerData.color !== masterData.color || followerData.layout !== masterData.layout) {
          updates.set(sortedGroup[i].id, { color: masterData.color || '', layout: masterData.layout || '' });
        }
      }
    });

    if (updates.size > 0) {
      setNodes(nds => nds.map(n => {
        const upd = updates.get(n.id);
        if (!upd) return n;
        return { ...n, data: { ...n.data, color: upd.color, layout: upd.layout } };
      }));
    }
  }, [nodes, setNodes]);

  return { getCascadeGroup, toggleCascadeLock };
}
