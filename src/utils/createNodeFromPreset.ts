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
  if (preset.type === 'processor' || preset.type === 'switcher') {
    const inputs = (preset.inputs || []).map(inp => ({
      id: uuidv4(),
      name: inp.name,
      connection: inp.connection || 'HDMI',
      resolution: inp.resolution || '1920x1080@60',
    }));
    const outputs = (preset.outputs || []).map(out => ({
      id: uuidv4(),
      name: out.name,
      connection: out.connection || 'HDMI',
      resolution: out.resolution || '1920x1080@60',
      destination: '',
    }));

    return {
      id: uuidv4(),
      type: preset.type,
      position,
      data: {
        label: preset.name,
        color: preset.color,
        inputs,
        outputs,
      },
    };
  }

  if (preset.type === 'router') {
    const size = ('size' in preset ? preset.size : 8) as number;
    const rows = Array.from({ length: size }, (_, i) => ({
      id: uuidv4(),
      source: '',
      inOut: String(i + 1),
      destination: '',
    }));

    return {
      id: uuidv4(),
      type: 'router',
      position,
      data: {
        label: preset.name,
        color: preset.color,
        rows,
      },
    };
  }

  if (preset.type === 'ledWall') {
    return {
      id: uuidv4(),
      type: 'ledWall',
      position,
      data: {
        label: preset.name,
        color: preset.color,
      },
    };
  }

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

  if (preset.type === 'card') {
    const isInput = preset.cardType === 'input';
    return {
      id: uuidv4(),
      type: 'card',
      position,
      data: {
        label: preset.name,
        color: preset.color,
        cardType: preset.cardType || 'input',
        connectors: isInput ? [
          { id: uuidv4(), type: 'DP 1.2', source: '', resolution: '3840x2160@60' },
          { id: uuidv4(), type: 'HDMI 2.0', source: '', resolution: '3840x2160@60' },
          { id: uuidv4(), type: '12G SDI', source: '', resolution: '3840x2160@60' },
        ] : [
          { id: uuidv4(), type: 'DP 1.2', resolution: '3840x2160@60', destination: '' },
          { id: uuidv4(), type: 'HDMI 2.0', resolution: '3840x2160@60', destination: '' },
          { id: uuidv4(), type: '12G SDI', resolution: '3840x2160@60', destination: '' },
        ],
      },
    };
  }

  if (preset.type === 'note') {
    return {
      id: uuidv4(),
      type: 'note',
      position,
      data: {
        label: 'NOTES',
        content: '',
        backgroundColor: preset.color,
      },
    };
  }

  if (preset.type === 'image') {
    return {
      id: uuidv4(),
      type: 'note',
      position,
      data: {
        label: 'Use Image button to import',
        content: '',
        backgroundColor: '#666',
      },
    };
  }

  // genericIO (default)
  const inputs = ('inputs' in preset && Array.isArray(preset.inputs) ? preset.inputs : []).map((inp: { name: string; type?: string }) => ({
    id: uuidv4(),
    name: inp.name,
    type: inp.type || 'Other',
  }));
  const outputs = ('outputs' in preset && Array.isArray(preset.outputs) ? preset.outputs : []).map((out: { name: string; type?: string }) => ({
    id: uuidv4(),
    name: out.name,
    type: out.type || 'Other',
  }));

  return {
    id: uuidv4(),
    type: 'genericIO',
    position,
    data: {
      label: preset.name,
      color: preset.color,
      inputs,
      outputs,
    },
  };
}
