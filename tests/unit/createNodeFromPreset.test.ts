import { describe, it, expect } from 'vitest';
import { createNodeFromPreset } from '../../src/utils/createNodeFromPreset';
import type { PresetItem } from '../../src/data/nodeCategories';

const position = { x: 100, y: 200 };

// React Flow's Node type has data: Record<string, unknown>,
// so we cast to any for runtime assertions in tests.

describe('createNodeFromPreset', () => {
  it('creates a genericIO node with correct structure', () => {
    const preset: PresetItem = {
      name: 'Test Source',
      type: 'genericIO',
      color: '#00aa44',
      inputs: [],
      outputs: [{ name: 'HDMI', type: 'HDMI' }],
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('genericIO');
    expect(node.position).toEqual(position);
    expect(node.id).toBeTruthy();
    expect(data.label).toBe('Test Source');
    expect(data.color).toBe('#00aa44');
    expect(data.outputs).toHaveLength(1);
    expect(data.outputs[0].name).toBe('HDMI');
    expect(data.outputs[0].type).toBe('HDMI');
    expect(data.outputs[0].id).toBeTruthy();
    expect(data.inputs).toHaveLength(0);
  });

  it('creates a processor node with inputs and outputs', () => {
    const preset: PresetItem = {
      name: 'Brompton SX40',
      type: 'processor',
      color: '#8B0000',
      inputs: [
        { name: '12G SDI A', connection: '12G SDI', resolution: '3840x2160@60' },
      ],
      outputs: [
        { name: 'A', connection: 'Ethernet', resolution: 'LED Data' },
      ],
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('processor');
    expect(data.inputs).toHaveLength(1);
    expect(data.inputs[0].name).toBe('12G SDI A');
    expect(data.inputs[0].connection).toBe('12G SDI');
    expect(data.inputs[0].resolution).toBe('3840x2160@60');
    expect(data.outputs).toHaveLength(1);
    expect(data.outputs[0].destination).toBe('');
  });

  it('creates a switcher node (same structure as processor)', () => {
    const preset: PresetItem = {
      name: 'ATEM Mini Pro',
      type: 'switcher',
      color: '#1a1a1a',
      inputs: [
        { name: 'HDMI 1', connection: 'HDMI', resolution: '1920x1080@60' },
      ],
      outputs: [
        { name: 'HDMI Out', connection: 'HDMI', resolution: '1920x1080@60' },
      ],
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('switcher');
    expect(data.inputs).toHaveLength(1);
    expect(data.outputs).toHaveLength(1);
    expect(data.outputs[0].destination).toBe('');
  });

  it('creates a router node with correct row count', () => {
    const preset: PresetItem = {
      name: 'BMD Router 20x20',
      type: 'router',
      color: '#1a1a1a',
      size: 20,
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('router');
    expect(data.rows).toHaveLength(20);
    expect(data.rows[0].inOut).toBe('1');
    expect(data.rows[19].inOut).toBe('20');
  });

  it('creates a router with default size 8 when size omitted', () => {
    const preset: PresetItem = {
      name: 'Custom Router',
      type: 'router',
      color: '#444',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(data.rows).toHaveLength(8);
  });

  it('creates a ledWall node', () => {
    const preset: PresetItem = {
      name: 'LED Wall',
      type: 'ledWall',
      color: '#ff6600',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('ledWall');
    expect(data.label).toBe('LED Wall');
    expect(data.color).toBe('#ff6600');
  });

  it('creates a barcoE3 node with default cards', () => {
    const preset: PresetItem = {
      name: 'Barco E3',
      type: 'barcoE3',
      color: '#006400',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('barcoE3');
    expect(data.cards).toHaveLength(2);
    expect(data.cards[0].cardType).toBe('input');
    expect(data.cards[1].cardType).toBe('output');
    expect(data.cards[0].connectors).toHaveLength(3);
    expect(data.cards[1].connectors).toHaveLength(3);
  });

  it('creates a note node', () => {
    const preset: PresetItem = {
      name: 'Note',
      type: 'note',
      color: '#ffeb3b',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('note');
    expect(data.label).toBe('NOTES');
    expect(data.content).toBe('');
    expect(data.backgroundColor).toBe('#ffeb3b');
  });

  it('generates unique IDs for each call', () => {
    const preset: PresetItem = {
      name: 'Test',
      type: 'genericIO',
      color: '#000',
      outputs: [{ name: 'Out', type: 'HDMI' }],
    };

    const node1 = createNodeFromPreset(preset, position);
    const node2 = createNodeFromPreset(preset, position);

    expect(node1.id).not.toBe(node2.id);
  });
});
