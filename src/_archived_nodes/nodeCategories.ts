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
  // SOURCES - Signal origins
  sources: {
    label: 'Sources',
    icon: '📤',
    items: [
      {
        name: 'Laptop',
        type: 'genericIO',
        color: '#4a4a4a',
        inputs: [],
        outputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'USB-C', type: 'USB-C' },
        ],
      },
    ],
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
      {
        name: 'BLACKMAGIC 12G 20X20',
        type: 'switcher',
        color: '#4a148c',
        inputs: Array.from({ length: 20 }, (_, i) => ({
          name: `IN ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
        outputs: Array.from({ length: 20 }, (_, i) => ({
          name: `OUT ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
      },
      {
        name: 'BLACKMAGIC 12G 40X40',
        type: 'switcher',
        color: '#4a148c',
        inputs: Array.from({ length: 40 }, (_, i) => ({
          name: `IN ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
        outputs: Array.from({ length: 40 }, (_, i) => ({
          name: `OUT ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
      },
    ],
  },

  // DESTINATIONS - Signal endpoints
  destinations: {
    label: 'Destinations',
    icon: '📥',
    items: [
      {
        name: 'LED Wall',
        type: 'ledWall',
        color: '#ff6600',
      },
      {
        name: 'Brompton SX40',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: '12G SDI A', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: '12G SDI B', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'HDMI 2.0', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'DP 1.2', connection: 'DisplayPort', resolution: '3840x2160@60' },
        ],
        outputs: [
          { name: 'A', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'B', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'C', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'D', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
    ],
  },

  // UTILITIES - Annotation and misc
  utilities: {
    label: 'Utilities',
    icon: '🛠️',
    items: [
      {
        name: 'Note',
        type: 'note',
        color: '#ffeb3b',
      },
    ],
  },
};

// Keep old name for backwards compatibility with saved presets
export const EQUIPMENT_PRESETS = NODE_CATEGORIES;
