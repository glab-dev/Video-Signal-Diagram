// Card Presets Configuration
// Central source of truth for pre-configured I/O card templates

export interface CardPresetPort {
  connector: string;
  resolution: string;
  refreshRate: string;
}

export interface CardPreset {
  id: string;
  label: string;
  category: 'input' | 'output' | 'bidirectional';
  manufacturer?: string;
  ports: CardPresetPort[];
}

// Card presets for quick port configuration
export const CARD_PRESETS: Record<string, CardPreset> = {
  // Barco Tri-Combo Cards
  'tri-combo-in': {
    id: 'tri-combo-in',
    label: 'Tri-Combo Input',
    category: 'input',
    manufacturer: 'Barco',
    ports: [
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
  'tri-combo-out': {
    id: 'tri-combo-out',
    label: 'Tri-Combo Output',
    category: 'output',
    manufacturer: 'Barco',
    ports: [
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
    ]
  },

  // Generic SDI Cards
  'sdi-4in': {
    id: 'sdi-4in',
    label: '4x SDI Input',
    category: 'input',
    ports: [
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
    ]
  },
  'sdi-4out': {
    id: 'sdi-4out',
    label: '4x SDI Output',
    category: 'output',
    ports: [
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
    ]
  },

  // 12G SDI Cards
  '12g-sdi-2in': {
    id: '12g-sdi-2in',
    label: '2x 12G SDI Input',
    category: 'input',
    ports: [
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
  '12g-sdi-2out': {
    id: '12g-sdi-2out',
    label: '2x 12G SDI Output',
    category: 'output',
    ports: [
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
    ]
  },

  // HDMI Cards
  'hdmi-4in': {
    id: 'hdmi-4in',
    label: '4x HDMI Input',
    category: 'input',
    ports: [
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
    ]
  },
  'hdmi-4out': {
    id: 'hdmi-4out',
    label: '4x HDMI Output',
    category: 'output',
    ports: [
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
      { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' },
    ]
  },

  // DisplayPort Cards
  'dp-4in': {
    id: 'dp-4in',
    label: '4x DisplayPort Input',
    category: 'input',
    ports: [
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
  'dp-4out': {
    id: 'dp-4out',
    label: '4x DisplayPort Output',
    category: 'output',
    ports: [
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
};

// Helper to get presets by category
export const getCardPresetsByCategory = (category: CardPreset['category']): CardPreset[] => {
  return Object.values(CARD_PRESETS).filter(p => p.category === category);
};

// Helper to get preset by ID
export const getCardPresetById = (id: string): CardPreset | undefined => {
  return CARD_PRESETS[id];
};

// Helper to get all preset IDs
export const getCardPresetIds = (): string[] => {
  return Object.keys(CARD_PRESETS);
};
