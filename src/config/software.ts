// Software Configuration
// Central source of truth for media server and playback software

export interface Software {
  id: string;
  label: string;
  category: 'playback' | 'vfx' | 'broadcast' | 'presentation' | 'streaming' | 'custom';
  platforms?: ('mac' | 'windows' | 'linux')[];
}

// Simple dropdown array for compatibility
export const SOFTWARE_PRESETS = [
  { id: 'none', label: 'None' },
  { id: 'qlab', label: 'QLAB' },
  { id: 'resolume', label: 'Resolume' },
  { id: 'vmix', label: 'vMix' },
  { id: 'obs', label: 'OBS' },
  { id: 'disguise', label: 'disguise' },
  { id: 'notch', label: 'Notch' },
  { id: 'touchdesigner', label: 'TouchDesigner' },
  { id: 'madmapper', label: 'MadMapper' },
  { id: 'millumin', label: 'Millumin' },
  { id: 'propresenter', label: 'ProPresenter' },
  { id: 'playbackpro', label: 'PlaybackPro' },
  { id: 'wirecast', label: 'Wirecast' },
  { id: 'watchout', label: 'WATCHOUT' },
  { id: 'pandoras-box', label: "Pandora's Box" },
  { id: 'hippotizer', label: 'Hippotizer' },
  { id: 'screenberry', label: 'Screenberry' },
  { id: 'custom', label: 'Custom...' },
] as const;

export type SoftwareId = typeof SOFTWARE_PRESETS[number]['id'];

// Detailed software definitions with metadata
export const SOFTWARE_CATALOG: Software[] = [
  // Playback
  { id: 'qlab', label: 'QLAB', category: 'playback', platforms: ['mac'] },
  { id: 'playbackpro', label: 'PlaybackPro', category: 'playback', platforms: ['mac', 'windows'] },
  { id: 'millumin', label: 'Millumin', category: 'playback', platforms: ['mac'] },
  { id: 'propresenter', label: 'ProPresenter', category: 'presentation', platforms: ['mac', 'windows'] },

  // VFX / Real-time
  { id: 'resolume', label: 'Resolume', category: 'vfx', platforms: ['mac', 'windows'] },
  { id: 'touchdesigner', label: 'TouchDesigner', category: 'vfx', platforms: ['mac', 'windows'] },
  { id: 'notch', label: 'Notch', category: 'vfx', platforms: ['windows'] },
  { id: 'madmapper', label: 'MadMapper', category: 'vfx', platforms: ['mac', 'windows'] },

  // Media Servers
  { id: 'disguise', label: 'disguise', category: 'playback', platforms: ['windows'] },
  { id: 'watchout', label: 'WATCHOUT', category: 'playback', platforms: ['windows'] },
  { id: 'pandoras-box', label: "Pandora's Box", category: 'playback', platforms: ['windows'] },
  { id: 'hippotizer', label: 'Hippotizer', category: 'playback', platforms: ['windows'] },
  { id: 'screenberry', label: 'Screenberry', category: 'playback', platforms: ['windows'] },

  // Broadcast / Streaming
  { id: 'vmix', label: 'vMix', category: 'broadcast', platforms: ['windows'] },
  { id: 'obs', label: 'OBS', category: 'streaming', platforms: ['mac', 'windows', 'linux'] },
  { id: 'wirecast', label: 'Wirecast', category: 'broadcast', platforms: ['mac', 'windows'] },
];

// Helper to get software by ID
export const getSoftwareById = (id: string): Software | undefined => {
  return SOFTWARE_CATALOG.find(s => s.id === id);
};

// Helper to get software by category
export const getSoftwareByCategory = (category: Software['category']): Software[] => {
  return SOFTWARE_CATALOG.filter(s => s.category === category);
};

// Helper to get software by platform
export const getSoftwareByPlatform = (platform: 'mac' | 'windows' | 'linux'): Software[] => {
  return SOFTWARE_CATALOG.filter(s => s.platforms?.includes(platform));
};

// Helper to get label by ID (for dropdowns)
export const getSoftwareLabel = (id: string): string | undefined => {
  return SOFTWARE_PRESETS.find(s => s.id === id)?.label;
};
