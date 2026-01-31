import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node } from '@xyflow/react';
import type { GearConfig, GenericIONodeData, NodePreset } from '../types';
import { savePreset } from '../store/db';

interface UseGearBuilderParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  getViewportCenter: () => { x: number; y: number };
}

export function useGearBuilder({ setNodes, getViewportCenter }: UseGearBuilderParams) {
  // Stagger counter for gear builder node placement
  const gearPlacementCounter = useRef(0);
  const gearPlacementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddGearNode = useCallback((config: GearConfig) => {
    const basePos = getViewportCenter();
    const offset = gearPlacementCounter.current * 30;
    const position = { x: basePos.x + offset, y: basePos.y + offset };
    gearPlacementCounter.current += 1;
    if (gearPlacementTimer.current) clearTimeout(gearPlacementTimer.current);
    gearPlacementTimer.current = setTimeout(() => { gearPlacementCounter.current = 0; }, 2000);

    const newNode: Node = {
      id: uuidv4(),
      type: config.nodeType,
      position,
      data: {
        label: config.label,
        color: config.color,
        layout: config.layout,
        ipAddress: config.ipAddress,
        inputs: config.inputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
        outputs: config.outputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
      },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes, getViewportCenter]);

  const handleSaveGearPreset = useCallback(async (config: GearConfig) => {
    const presetName = prompt('Enter a name for this preset:', config.label);
    if (!presetName) return;

    const preset: NodePreset = {
      id: uuidv4(),
      name: presetName,
      nodeType: config.nodeType,
      data: {
        label: config.label,
        color: config.color,
        layout: config.layout,
        ipAddress: config.ipAddress,
        inputs: config.inputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
        outputs: config.outputs.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type || 'HDMI',
        })),
      } as GenericIONodeData,
      category: 'basic',
      createdAt: Date.now(),
    };

    await savePreset(preset);
    // Dispatch event so sidebar can refresh
    window.dispatchEvent(new CustomEvent('presetSaved'));
  }, []);

  const handleApplyGearToSelected = useCallback((config: GearConfig) => {
    setNodes(nds => nds.map(node => {
      if (!node.selected) return node;

      // Apply gear config to selected nodes
      return {
        ...node,
        type: config.nodeType,
        data: {
          ...node.data,
          label: node.data?.label || config.label, // Keep existing label
          color: config.color,
          layout: config.layout,
          ipAddress: config.ipAddress || node.data?.ipAddress,
          inputs: config.inputs.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type || 'HDMI',
          })),
          outputs: config.outputs.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type || 'HDMI',
          })),
        },
      };
    }));
  }, [setNodes]);

  return {
    handleAddGearNode,
    handleSaveGearPreset,
    handleApplyGearToSelected,
  };
}
