// Connector Types Configuration
// Central source of truth for all video/audio/data connector types

export interface ConnectorType {
  id: string;
  label: string;
  category: 'video' | 'audio' | 'data' | 'power';
  maxResolution?: string;
  maxRefreshRate?: number;
}

// Simple string array for dropdown compatibility
export const CONNECTOR_TYPES = [
  'HDMI',
  'SDI',
  '3G SDI',
  '12G SDI',
  'DisplayPort',
  'DVI',
  'VGA',
  'USB-C',
  'Thunderbolt',
  'NDI',
  'Ethernet',
  'Fiber',
  'Custom...'
] as const;

export type ConnectorTypeId = typeof CONNECTOR_TYPES[number];

// Detailed connector definitions with metadata
export const CONNECTORS: ConnectorType[] = [
  { id: 'hdmi', label: 'HDMI', category: 'video', maxResolution: '8K', maxRefreshRate: 120 },
  { id: 'hdmi-2.0', label: 'HDMI 2.0', category: 'video', maxResolution: '4K', maxRefreshRate: 60 },
  { id: 'hdmi-2.1', label: 'HDMI 2.1', category: 'video', maxResolution: '8K', maxRefreshRate: 120 },
  { id: 'sdi', label: 'SDI', category: 'video', maxResolution: '1080p', maxRefreshRate: 60 },
  { id: '3g-sdi', label: '3G SDI', category: 'video', maxResolution: '1080p', maxRefreshRate: 60 },
  { id: '12g-sdi', label: '12G SDI', category: 'video', maxResolution: '4K', maxRefreshRate: 60 },
  { id: 'displayport', label: 'DisplayPort', category: 'video', maxResolution: '8K', maxRefreshRate: 120 },
  { id: 'dp-1.2', label: 'DP 1.2', category: 'video', maxResolution: '4K', maxRefreshRate: 60 },
  { id: 'dp-1.4', label: 'DP 1.4', category: 'video', maxResolution: '8K', maxRefreshRate: 60 },
  { id: 'dvi', label: 'DVI', category: 'video', maxResolution: '2560x1600', maxRefreshRate: 60 },
  { id: 'vga', label: 'VGA', category: 'video', maxResolution: '2048x1536', maxRefreshRate: 85 },
  { id: 'usb-c', label: 'USB-C', category: 'video', maxResolution: '4K', maxRefreshRate: 60 },
  { id: 'thunderbolt', label: 'Thunderbolt', category: 'video', maxResolution: '8K', maxRefreshRate: 60 },
  { id: 'ndi', label: 'NDI', category: 'data', maxResolution: '4K', maxRefreshRate: 60 },
  { id: 'ethernet', label: 'Ethernet', category: 'data' },
  { id: 'fiber', label: 'Fiber', category: 'data' },
];

// Helper to get connector by ID
export const getConnectorById = (id: string): ConnectorType | undefined => {
  return CONNECTORS.find(c => c.id === id);
};

// Helper to get connectors by category
export const getConnectorsByCategory = (category: ConnectorType['category']): ConnectorType[] => {
  return CONNECTORS.filter(c => c.category === category);
};
