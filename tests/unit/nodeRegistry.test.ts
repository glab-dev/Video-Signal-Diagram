import { describe, it, expect } from 'vitest';
import { nodeTypes } from '../../src/components/nodes';

describe('nodeTypes registry', () => {
  const expectedTypes = [
    'barcoE3',
    'supernode',
  ];

  it('has exactly 2 registered node types', () => {
    expect(Object.keys(nodeTypes)).toHaveLength(2);
  });

  it('contains all expected node types', () => {
    const registryKeys = Object.keys(nodeTypes);
    for (const type of expectedTypes) {
      expect(registryKeys).toContain(type);
    }
  });

  it('has no unexpected node types', () => {
    const registryKeys = Object.keys(nodeTypes);
    for (const key of registryKeys) {
      expect(expectedTypes).toContain(key);
    }
  });

  it('each registered type maps to a component (not null/undefined)', () => {
    for (const [key, component] of Object.entries(nodeTypes)) {
      expect(component, `nodeTypes.${key} should be a component`).toBeTruthy();
    }
  });
});
