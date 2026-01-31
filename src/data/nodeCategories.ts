// Type for preset items
export type PresetItem = {
  name: string;
  type: string;
  color: string;
  inputs?: { name: string; connection?: string; resolution?: string; type?: string }[];
  outputs?: { name: string; connection?: string; resolution?: string; type?: string }[];
  size?: number;
  cardType?: string;
};

// Node categories organized by signal flow role
export const NODE_CATEGORIES = {
  // SOURCES - Signal origins
  sources: {
    label: 'Sources',
    icon: '📤',
    items: [
      {
        name: 'Custom Source',
        type: 'genericIO',
        color: '#00aa44',
        inputs: [],
        outputs: [
          { name: 'Output 1', type: 'Other' },
        ],
      },
      {
        name: 'Mac',
        type: 'genericIO',
        color: '#4a4a4a',
        inputs: [],
        outputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'USB-C', type: 'USB-C' },
          { name: 'Thunderbolt', type: 'USB-C' },
        ],
      },
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
      {
        name: 'Camera',
        type: 'genericIO',
        color: '#2d2d2d',
        inputs: [],
        outputs: [
          { name: 'SDI Out', type: 'SDI' },
          { name: 'HDMI Out', type: 'HDMI' },
        ],
      },
      {
        name: 'Media Server',
        type: 'genericIO',
        color: '#1a3a5c',
        inputs: [],
        outputs: [
          { name: 'SDI 1', type: 'SDI' },
          { name: 'SDI 2', type: 'SDI' },
          { name: 'SDI 3', type: 'SDI' },
          { name: 'SDI 4', type: 'SDI' },
        ],
      },
      {
        name: 'NDI Source',
        type: 'genericIO',
        color: '#5c3d1a',
        inputs: [],
        outputs: [
          { name: 'NDI', type: 'NDI' },
        ],
      },
      {
        name: 'Output Card',
        type: 'card',
        cardType: 'output',
        color: '#50e3c2',
      },
    ],
  },

  // PROCESSORS - Signal processing devices
  processors: {
    label: 'Processors',
    icon: '⚙️',
    items: [
      {
        name: 'Custom Processor',
        type: 'processor',
        color: '#0088cc',
        inputs: [
          { name: 'IN 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'OUT 1', connection: 'Ethernet', resolution: 'LED Data', destination: '' },
        ],
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
      {
        name: 'Brompton S8',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: 'HDMI', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'DVI', connection: 'DVI', resolution: '1920x1200@60' },
        ],
        outputs: [
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 2', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
      {
        name: 'Brompton M2',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: 'HDMI', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 2', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
      {
        name: 'Brompton S4',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: 'HDMI', connection: 'HDMI 1.4', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
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
        name: 'Custom Switcher',
        type: 'switcher',
        color: '#4a148c',
        inputs: [
          { name: 'IN 1', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'IN 2', connection: 'HDMI', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'PGM', connection: 'HDMI', resolution: '1920x1080@60', destination: '' },
        ],
      },
      {
        name: 'Custom Router',
        type: 'router',
        color: '#444',
        size: 4,
      },
      {
        name: 'Barco E3',
        type: 'barcoE3',
        color: '#006400',
      },
      {
        name: 'Barco E2',
        type: 'switcher',
        color: '#006400',
        inputs: [
          { name: 'SDI 1', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 2', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 3', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 4', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'HDMI 1', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'HDMI 2', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'DP 1', connection: 'DisplayPort', resolution: '3840x2160@60' },
          { name: 'DP 2', connection: 'DisplayPort', resolution: '3840x2160@60' },
        ],
        outputs: [
          { name: 'PGM 1', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'PGM 2', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'PGM 3', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'PGM 4', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'AUX 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'AUX 2', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
      },
      {
        name: 'Barco S3',
        type: 'switcher',
        color: '#006400',
        inputs: [
          { name: 'SDI 1', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 2', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'HDMI 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'HDMI 2', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'PGM 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'PGM 2', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
      },
      {
        name: 'ATEM 4 M/E',
        type: 'switcher',
        color: '#1a1a1a',
        inputs: [
          { name: 'SDI 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 2', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 3', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 4', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 5', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 6', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 7', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 8', connection: '12G SDI', resolution: '3840x2160@60' },
        ],
        outputs: [
          { name: 'PGM 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'PGM 2', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'AUX 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'AUX 2', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'M/E 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'M/E 2', connection: '12G SDI', resolution: '3840x2160@60' },
        ],
      },
      {
        name: 'ATEM Mini Pro',
        type: 'switcher',
        color: '#1a1a1a',
        inputs: [
          { name: 'HDMI 1', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'HDMI 2', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'HDMI 3', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'HDMI 4', connection: 'HDMI', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'HDMI Out', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'USB-C', connection: 'USB-C', resolution: '1920x1080@60' },
        ],
      },
      {
        name: 'BMD Router 20x20',
        type: 'router',
        color: '#1a1a1a',
        size: 20,
      },
      {
        name: 'BMD Router 12x12',
        type: 'router',
        color: '#1a1a1a',
        size: 12,
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
    ],
  },

  // DESTINATIONS - Signal endpoints
  destinations: {
    label: 'Destinations',
    icon: '📥',
    items: [
      {
        name: 'Custom Destination',
        type: 'genericIO',
        color: '#cc4400',
        inputs: [
          { name: 'Input 1', type: 'Other' },
        ],
        outputs: [],
      },
      {
        name: 'Monitor',
        type: 'genericIO',
        color: '#3d3d3d',
        inputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'SDI', type: 'SDI' },
        ],
        outputs: [],
      },
      {
        name: 'Projector',
        type: 'genericIO',
        color: '#2d4a2d',
        inputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'SDI', type: 'SDI' },
          { name: 'DVI', type: 'DVI' },
        ],
        outputs: [],
      },
      {
        name: 'LED Wall',
        type: 'ledWall',
        color: '#ff6600',
      },
      {
        name: 'Recorder',
        type: 'genericIO',
        color: '#5c1a1a',
        inputs: [
          { name: 'SDI In', type: 'SDI' },
          { name: 'HDMI In', type: 'HDMI' },
        ],
        outputs: [],
      },
      {
        name: 'Input Card',
        type: 'card',
        cardType: 'input',
        color: '#4a9eff',
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
      {
        name: 'Image',
        type: 'image',
        color: '#666',
      },
      {
        name: 'Custom Device',
        type: 'genericIO',
        color: '#0088cc',
        inputs: [{ name: 'Input 1', type: 'Other' }],
        outputs: [{ name: 'Output 1', type: 'Other' }],
      },
    ],
  },
};

// Keep old name for backwards compatibility with saved presets
export const EQUIPMENT_PRESETS = NODE_CATEGORIES;
