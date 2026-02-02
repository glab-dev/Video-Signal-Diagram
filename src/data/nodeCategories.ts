// Type for preset items
export type PresetItem = {
  name: string;
  type: string;
  color: string;
  inputs?: { name: string; connection?: string; resolution?: string; type?: string }[];
  outputs?: { name: string; connection?: string; resolution?: string; type?: string }[];
};

// Node categories organized by signal flow role
export const NODE_CATEGORIES = {
  // SUPERNODES - Flexible source/destination
  supernodes: {
    label: 'Supernodes',
    icon: '⚡',
    items: [
      {
        name: 'Supernode',
        type: 'supernode',
        color: '#8800ff',
      },
    ],
  },

  // SOURCES - Signal origins
  sources: {
    label: 'Sources',
    icon: '📤',
    items: [] as PresetItem[],
  },

  // SWITCHERS - Signal routing devices
  switchers: {
    label: 'Switchers',
    icon: '🔀',
    items: [
      {
        name: 'Barco E3',
        type: 'barcoE3',
        color: '#006400',
      },
    ],
  },

  // DESTINATIONS - Signal endpoints
  destinations: {
    label: 'Destinations',
    icon: '📥',
    items: [] as PresetItem[],
  },

  // UTILITIES - Annotation and misc
  utilities: {
    label: 'Utilities',
    icon: '🛠️',
    items: [] as PresetItem[],
  },
};

// Keep old name for backwards compatibility with saved presets
export const EQUIPMENT_PRESETS = NODE_CATEGORIES;
