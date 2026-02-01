// Resolution Configuration
// Central source of truth for all resolution presets

export interface Resolution {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  category: 'sd' | 'hd' | '2k' | '4k' | '8k' | 'custom';
}

// Simple string array for dropdown compatibility
export const RESOLUTIONS = [
  '640x480',
  '800x600',
  '1024x768',
  '1280x720',
  '1920x1080',
  '2560x1440',
  '3840x2160',
  '4096x2160',
  '7680x4320',
  'Custom...'
] as const;

export type ResolutionId = typeof RESOLUTIONS[number];

// Detailed resolution definitions with metadata
export const RESOLUTION_PRESETS: Resolution[] = [
  // SD
  { id: '640x480', label: '640×480 (VGA)', width: 640, height: 480, aspectRatio: '4:3', category: 'sd' },
  { id: '800x600', label: '800×600 (SVGA)', width: 800, height: 600, aspectRatio: '4:3', category: 'sd' },
  { id: '1024x768', label: '1024×768 (XGA)', width: 1024, height: 768, aspectRatio: '4:3', category: 'sd' },

  // HD
  { id: '1280x720', label: '1280×720 (720p)', width: 1280, height: 720, aspectRatio: '16:9', category: 'hd' },
  { id: '1920x1080', label: '1920×1080 (1080p)', width: 1920, height: 1080, aspectRatio: '16:9', category: 'hd' },
  { id: '1920x1200', label: '1920×1200 (WUXGA)', width: 1920, height: 1200, aspectRatio: '16:10', category: 'hd' },

  // 2K
  { id: '2048x1080', label: '2048×1080 (2K DCI)', width: 2048, height: 1080, aspectRatio: '17:9', category: '2k' },
  { id: '2560x1440', label: '2560×1440 (QHD)', width: 2560, height: 1440, aspectRatio: '16:9', category: '2k' },
  { id: '2560x1600', label: '2560×1600 (WQXGA)', width: 2560, height: 1600, aspectRatio: '16:10', category: '2k' },

  // 4K
  { id: '3840x2160', label: '3840×2160 (4K UHD)', width: 3840, height: 2160, aspectRatio: '16:9', category: '4k' },
  { id: '4096x2160', label: '4096×2160 (4K DCI)', width: 4096, height: 2160, aspectRatio: '17:9', category: '4k' },

  // 8K
  { id: '7680x4320', label: '7680×4320 (8K UHD)', width: 7680, height: 4320, aspectRatio: '16:9', category: '8k' },
  { id: '8192x4320', label: '8192×4320 (8K DCI)', width: 8192, height: 4320, aspectRatio: '17:9', category: '8k' },
];

// Helper to get resolution by ID
export const getResolutionById = (id: string): Resolution | undefined => {
  return RESOLUTION_PRESETS.find(r => r.id === id);
};

// Helper to get resolutions by category
export const getResolutionsByCategory = (category: Resolution['category']): Resolution[] => {
  return RESOLUTION_PRESETS.filter(r => r.category === category);
};

// Helper to parse resolution string to width/height
export const parseResolution = (res: string): { width: number; height: number } | null => {
  const match = res.match(/^(\d+)x(\d+)/);
  if (match) {
    return { width: parseInt(match[1]), height: parseInt(match[2]) };
  }
  return null;
};
