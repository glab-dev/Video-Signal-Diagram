import type { Node } from '@xyflow/react';
import type { PresetItem } from '../data/nodeCategories';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a React Flow Node from a preset item definition and position.
 */
export function createNodeFromPreset(
  preset: PresetItem,
  position: { x: number; y: number }
): Node {
  if (preset.type === 'barcoE3') {
    return {
      id: uuidv4(),
      type: 'barcoE3',
      position,
      data: {
        label: preset.name,
        color: preset.color,
        cards: [
          {
            id: uuidv4(),
            label: 'TRI COMBO - INPUT',
            cardType: 'input',
            connectors: [
              { id: uuidv4(), type: 'DP 1.2', source: '', resolution: '3840x2160@60' },
              { id: uuidv4(), type: 'HDMI 2.0', source: '', resolution: '3840x2160@60' },
              { id: uuidv4(), type: '12G SDI', source: '', resolution: '3840x2160@60' },
            ],
          },
          {
            id: uuidv4(),
            label: 'TRI COMBO - OUTPUT',
            cardType: 'output',
            connectors: [
              { id: uuidv4(), type: 'DP 1.2', resolution: '3840x2160@60', destination: '' },
              { id: uuidv4(), type: 'HDMI 2.0', resolution: '3840x2160@60', destination: '' },
              { id: uuidv4(), type: '12G SDI', resolution: '3840x2160@60', destination: '' },
            ],
          },
        ],
      },
    };
  }

  if (preset.type === 'supernode') {
    return {
      id: uuidv4(),
      type: 'supernode',
      position,
      data: {
        label: preset.name,
        color: preset.color,
        platform: '',
        software: 'None',
        captureCard: 'None',
        inputs: [
          { id: uuidv4(), name: 'IN 1', connector: 'HDMI', resolution: '1920x1080', rate: '59.94', checked: false },
        ],
        outputs: [
          { id: uuidv4(), name: 'OUT 1', connector: 'HDMI', resolution: '1920x1080', rate: '60', checked: false },
        ],
        sysCollapsed: false,
      },
    };
  }

  // Fallback for unknown types — creates a basic node
  return {
    id: uuidv4(),
    type: preset.type,
    position,
    data: {
      label: preset.name,
      color: preset.color,
    },
  };
}
