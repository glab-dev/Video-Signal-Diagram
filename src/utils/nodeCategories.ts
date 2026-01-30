// Node category definitions and utilities
// This maps node types to their signal flow categories

export type NodeCategory = 'source' | 'processor' | 'switcher' | 'destination' | 'utility';

// Node types that are always a specific category
const NODE_TYPE_CATEGORIES: Record<string, NodeCategory> = {
  // Processors - signal processing devices
  processor: 'processor',

  // Switchers - signal routing devices
  switcher: 'switcher',
  router: 'switcher',
  barcoE3: 'switcher',

  // Destinations - signal endpoints
  ledWall: 'destination',

  // Utilities - annotation and misc
  note: 'utility',
  image: 'utility',
};

// For genericIO and card nodes, category is determined by input/output configuration
interface NodeWithIO {
  type: string;
  data: {
    inputs?: unknown[];
    outputs?: unknown[];
    cardType?: 'input' | 'output';
    connectors?: unknown[];
  };
}

/**
 * Determines the category of a node based on its type and configuration.
 *
 * Categories:
 * - source: Signal origins (outputs only, or output cards)
 * - processor: Signal processing devices
 * - switcher: Signal routing devices (switchers, routers, barcoE3)
 * - destination: Signal endpoints (inputs only, or input cards)
 * - utility: Annotation and misc (notes, images)
 */
export function getNodeCategory(node: NodeWithIO): NodeCategory {
  const { type, data } = node;

  // Check if this node type has a fixed category
  if (NODE_TYPE_CATEGORIES[type]) {
    return NODE_TYPE_CATEGORIES[type];
  }

  // Handle card nodes - category based on cardType
  if (type === 'card') {
    return data.cardType === 'output' ? 'source' : 'destination';
  }

  // Handle genericIO nodes - category based on inputs/outputs
  if (type === 'genericIO') {
    const hasInputs = Array.isArray(data.inputs) && data.inputs.length > 0;
    const hasOutputs = Array.isArray(data.outputs) && data.outputs.length > 0;

    if (hasOutputs && !hasInputs) {
      return 'source';
    }
    if (hasInputs && !hasOutputs) {
      return 'destination';
    }
    // Has both inputs and outputs - treat as processor
    return 'processor';
  }

  // Default to utility for unknown types
  return 'utility';
}

/**
 * Checks if a node is a source (provides signal output)
 */
export function isSourceNode(node: NodeWithIO): boolean {
  return getNodeCategory(node) === 'source';
}

/**
 * Checks if a node is a destination (receives signal input)
 */
export function isDestinationNode(node: NodeWithIO): boolean {
  return getNodeCategory(node) === 'destination';
}

/**
 * Checks if a node is a processor
 */
export function isProcessorNode(node: NodeWithIO): boolean {
  return getNodeCategory(node) === 'processor';
}

/**
 * Checks if a node is a switcher/router
 */
export function isSwitcherNode(node: NodeWithIO): boolean {
  return getNodeCategory(node) === 'switcher';
}

/**
 * Gets the category label for display
 */
export function getCategoryLabel(category: NodeCategory): string {
  const labels: Record<NodeCategory, string> = {
    source: 'Source',
    processor: 'Processor',
    switcher: 'Switcher',
    destination: 'Destination',
    utility: 'Utility',
  };
  return labels[category];
}

/**
 * Gets the category icon
 */
export function getCategoryIcon(category: NodeCategory): string {
  const icons: Record<NodeCategory, string> = {
    source: '📤',
    processor: '⚙️',
    switcher: '🔀',
    destination: '📥',
    utility: '🛠️',
  };
  return icons[category];
}
