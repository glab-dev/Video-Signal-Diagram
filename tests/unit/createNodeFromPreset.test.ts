import { describe, it, expect } from 'vitest';
import { createNodeFromPreset } from '../../src/utils/createNodeFromPreset';
import type { PresetItem } from '../../src/data/nodeCategories';

const position = { x: 100, y: 200 };

// React Flow's Node type has data: Record<string, unknown>,
// so we cast to any for runtime assertions in tests.

describe('createNodeFromPreset', () => {
  it('creates a barcoE3 node with default cards', () => {
    const preset: PresetItem = {
      name: 'Barco E3',
      type: 'barcoE3',
      color: '#006400',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('barcoE3');
    expect(node.position).toEqual(position);
    expect(node.id).toBeTruthy();
    expect(data.label).toBe('Barco E3');
    expect(data.color).toBe('#006400');
    expect(data.cards).toHaveLength(2);
    expect(data.cards[0].cardType).toBe('input');
    expect(data.cards[1].cardType).toBe('output');
    expect(data.cards[0].connectors).toHaveLength(3);
    expect(data.cards[1].connectors).toHaveLength(3);
  });

  it('creates a supernode with default inputs and outputs', () => {
    const preset: PresetItem = {
      name: 'Supernode',
      type: 'supernode',
      color: '#8800ff',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('supernode');
    expect(node.position).toEqual(position);
    expect(node.id).toBeTruthy();
    expect(data.label).toBe('Supernode');
    expect(data.color).toBe('#8800ff');
    expect(data.inputs).toHaveLength(1);
    expect(data.outputs).toHaveLength(1);
    expect(data.inputs[0].name).toBe('IN 1');
    expect(data.outputs[0].name).toBe('OUT 1');
    expect(data.software).toBe('None');
    expect(data.captureCard).toBe('None');
  });

  it('creates a fallback node for unknown types', () => {
    const preset: PresetItem = {
      name: 'Unknown Device',
      type: 'someFutureType',
      color: '#ff0000',
    };

    const node = createNodeFromPreset(preset, position);
    const data = node.data as any;

    expect(node.type).toBe('someFutureType');
    expect(data.label).toBe('Unknown Device');
    expect(data.color).toBe('#ff0000');
  });

  it('generates unique IDs for each call', () => {
    const preset: PresetItem = {
      name: 'Barco E3',
      type: 'barcoE3',
      color: '#006400',
    };

    const node1 = createNodeFromPreset(preset, position);
    const node2 = createNodeFromPreset(preset, position);

    expect(node1.id).not.toBe(node2.id);
  });
});
