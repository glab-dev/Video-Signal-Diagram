// Platform Configuration
// Central source of truth for hardware platform options

export interface Platform {
  id: string;
  label: string;
  manufacturer: 'apple' | 'pc' | 'linux' | 'other';
  type: 'desktop' | 'laptop' | 'server' | 'custom';
}

// Simple string array for dropdown compatibility
export const PLATFORMS = [
  'MacBook Pro',
  'MacBook Air',
  'Mac Mini',
  'Mac Studio',
  'Mac Pro',
  'iMac',
  'Windows PC',
  'Windows Laptop',
  'Linux PC',
  'Linux Server',
  'Raspberry Pi',
  'Custom...'
] as const;

export type PlatformId = typeof PLATFORMS[number];

// Detailed platform definitions with metadata
export const PLATFORM_PRESETS: Platform[] = [
  // Apple
  { id: 'macbook-pro', label: 'MacBook Pro', manufacturer: 'apple', type: 'laptop' },
  { id: 'macbook-air', label: 'MacBook Air', manufacturer: 'apple', type: 'laptop' },
  { id: 'mac-mini', label: 'Mac Mini', manufacturer: 'apple', type: 'desktop' },
  { id: 'mac-studio', label: 'Mac Studio', manufacturer: 'apple', type: 'desktop' },
  { id: 'mac-pro', label: 'Mac Pro', manufacturer: 'apple', type: 'desktop' },
  { id: 'imac', label: 'iMac', manufacturer: 'apple', type: 'desktop' },

  // Windows
  { id: 'windows-pc', label: 'Windows PC', manufacturer: 'pc', type: 'desktop' },
  { id: 'windows-laptop', label: 'Windows Laptop', manufacturer: 'pc', type: 'laptop' },
  { id: 'windows-server', label: 'Windows Server', manufacturer: 'pc', type: 'server' },

  // Linux
  { id: 'linux-pc', label: 'Linux PC', manufacturer: 'linux', type: 'desktop' },
  { id: 'linux-server', label: 'Linux Server', manufacturer: 'linux', type: 'server' },
  { id: 'raspberry-pi', label: 'Raspberry Pi', manufacturer: 'linux', type: 'desktop' },
];

// Helper to get platform by ID
export const getPlatformById = (id: string): Platform | undefined => {
  return PLATFORM_PRESETS.find(p => p.id === id);
};

// Helper to get platforms by manufacturer
export const getPlatformsByManufacturer = (manufacturer: Platform['manufacturer']): Platform[] => {
  return PLATFORM_PRESETS.filter(p => p.manufacturer === manufacturer);
};
