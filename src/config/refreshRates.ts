// Refresh Rate Configuration
// Central source of truth for all frame rate options

export interface RefreshRate {
  id: string;
  label: string;
  value: number;
  standard: 'film' | 'broadcast' | 'gaming' | 'custom';
  region?: 'ntsc' | 'pal' | 'universal';
}

// Simple string array for dropdown compatibility
export const REFRESH_RATES = [
  '23.98',
  '24',
  '25',
  '29.97',
  '30',
  '50',
  '59.94',
  '60',
  '120',
  '144',
  '240',
  'Custom...'
] as const;

export type RefreshRateId = typeof REFRESH_RATES[number];

// Detailed refresh rate definitions with metadata
export const REFRESH_RATE_PRESETS: RefreshRate[] = [
  // Film
  { id: '23.98', label: '23.98 Hz', value: 23.976, standard: 'film', region: 'ntsc' },
  { id: '24', label: '24 Hz', value: 24, standard: 'film', region: 'universal' },

  // Broadcast - PAL
  { id: '25', label: '25 Hz', value: 25, standard: 'broadcast', region: 'pal' },
  { id: '50', label: '50 Hz', value: 50, standard: 'broadcast', region: 'pal' },

  // Broadcast - NTSC
  { id: '29.97', label: '29.97 Hz', value: 29.97, standard: 'broadcast', region: 'ntsc' },
  { id: '30', label: '30 Hz', value: 30, standard: 'broadcast', region: 'universal' },
  { id: '59.94', label: '59.94 Hz', value: 59.94, standard: 'broadcast', region: 'ntsc' },
  { id: '60', label: '60 Hz', value: 60, standard: 'broadcast', region: 'universal' },

  // Gaming
  { id: '120', label: '120 Hz', value: 120, standard: 'gaming' },
  { id: '144', label: '144 Hz', value: 144, standard: 'gaming' },
  { id: '240', label: '240 Hz', value: 240, standard: 'gaming' },
];

// Helper to get refresh rate by ID
export const getRefreshRateById = (id: string): RefreshRate | undefined => {
  return REFRESH_RATE_PRESETS.find(r => r.id === id);
};

// Helper to get refresh rates by standard
export const getRefreshRatesByStandard = (standard: RefreshRate['standard']): RefreshRate[] => {
  return REFRESH_RATE_PRESETS.filter(r => r.standard === standard);
};

// Helper to get refresh rates by region
export const getRefreshRatesByRegion = (region: RefreshRate['region']): RefreshRate[] => {
  return REFRESH_RATE_PRESETS.filter(r => r.region === region || r.region === 'universal');
};
