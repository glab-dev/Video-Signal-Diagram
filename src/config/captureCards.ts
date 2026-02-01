// Capture Card Configuration
// Central source of truth for capture card models

export interface CaptureCard {
  id: string;
  label: string;
  manufacturer: 'blackmagic' | 'elgato' | 'magewell' | 'aja' | 'other';
  type: 'pcie' | 'usb' | 'thunderbolt';
  inputs?: number;
  outputs?: number;
  maxResolution?: string;
}

// Simple dropdown array for compatibility
export const CAPTURE_CARDS = [
  { id: 'none', label: 'None' },
  // Blackmagic DeckLink
  { id: 'decklink-duo-2', label: 'Blackmagic DeckLink Duo 2' },
  { id: 'decklink-quad-2', label: 'Blackmagic DeckLink Quad 2' },
  { id: 'decklink-8k', label: 'Blackmagic DeckLink 8K Pro' },
  { id: 'decklink-mini-recorder', label: 'Blackmagic DeckLink Mini Recorder' },
  { id: 'decklink-mini-monitor', label: 'Blackmagic DeckLink Mini Monitor' },
  { id: 'decklink-4k-extreme', label: 'Blackmagic DeckLink 4K Extreme' },
  // Blackmagic UltraStudio
  { id: 'ultrastudio-4k-mini', label: 'Blackmagic UltraStudio 4K Mini' },
  { id: 'ultrastudio-recorder-3g', label: 'Blackmagic UltraStudio Recorder 3G' },
  { id: 'ultrastudio-hd-mini', label: 'Blackmagic UltraStudio HD Mini' },
  // Blackmagic Other
  { id: 'intensity-pro-4k', label: 'Blackmagic Intensity Pro 4K' },
  // Elgato
  { id: 'elgato-4k60', label: 'Elgato 4K60 Pro' },
  { id: 'elgato-hd60', label: 'Elgato HD60 S+' },
  { id: 'elgato-camlink', label: 'Elgato Cam Link 4K' },
  // Magewell
  { id: 'magewell-pro-capture', label: 'Magewell Pro Capture' },
  { id: 'magewell-usb-capture', label: 'Magewell USB Capture' },
  { id: 'magewell-quad-hdmi', label: 'Magewell Pro Capture Quad HDMI' },
  // AJA
  { id: 'aja-kona', label: 'AJA Kona' },
  { id: 'aja-corvid', label: 'AJA Corvid' },
  { id: 'aja-io-4k', label: 'AJA Io 4K' },
  { id: 'aja-u-tap', label: 'AJA U-TAP' },
  // Custom
  { id: 'custom', label: 'Custom...' },
] as const;

export type CaptureCardId = typeof CAPTURE_CARDS[number]['id'];

// Detailed capture card definitions with metadata
export const CAPTURE_CARD_CATALOG: CaptureCard[] = [
  // Blackmagic DeckLink
  { id: 'decklink-duo-2', label: 'DeckLink Duo 2', manufacturer: 'blackmagic', type: 'pcie', inputs: 2, outputs: 2, maxResolution: '1080p' },
  { id: 'decklink-quad-2', label: 'DeckLink Quad 2', manufacturer: 'blackmagic', type: 'pcie', inputs: 4, outputs: 4, maxResolution: '1080p' },
  { id: 'decklink-8k', label: 'DeckLink 8K Pro', manufacturer: 'blackmagic', type: 'pcie', inputs: 4, outputs: 4, maxResolution: '8K' },
  { id: 'decklink-mini-recorder', label: 'DeckLink Mini Recorder', manufacturer: 'blackmagic', type: 'pcie', inputs: 1, maxResolution: '1080p' },
  { id: 'decklink-mini-monitor', label: 'DeckLink Mini Monitor', manufacturer: 'blackmagic', type: 'pcie', outputs: 1, maxResolution: '1080p' },
  { id: 'decklink-4k-extreme', label: 'DeckLink 4K Extreme', manufacturer: 'blackmagic', type: 'pcie', inputs: 1, outputs: 1, maxResolution: '4K' },

  // Blackmagic UltraStudio
  { id: 'ultrastudio-4k-mini', label: 'UltraStudio 4K Mini', manufacturer: 'blackmagic', type: 'thunderbolt', inputs: 1, outputs: 1, maxResolution: '4K' },
  { id: 'ultrastudio-recorder-3g', label: 'UltraStudio Recorder 3G', manufacturer: 'blackmagic', type: 'thunderbolt', inputs: 1, maxResolution: '1080p' },
  { id: 'ultrastudio-hd-mini', label: 'UltraStudio HD Mini', manufacturer: 'blackmagic', type: 'thunderbolt', inputs: 1, outputs: 1, maxResolution: '1080p' },

  // Elgato
  { id: 'elgato-4k60', label: '4K60 Pro', manufacturer: 'elgato', type: 'pcie', inputs: 1, maxResolution: '4K' },
  { id: 'elgato-hd60', label: 'HD60 S+', manufacturer: 'elgato', type: 'usb', inputs: 1, maxResolution: '1080p' },
  { id: 'elgato-camlink', label: 'Cam Link 4K', manufacturer: 'elgato', type: 'usb', inputs: 1, maxResolution: '4K' },

  // Magewell
  { id: 'magewell-pro-capture', label: 'Pro Capture', manufacturer: 'magewell', type: 'pcie', inputs: 1, maxResolution: '4K' },
  { id: 'magewell-usb-capture', label: 'USB Capture', manufacturer: 'magewell', type: 'usb', inputs: 1, maxResolution: '4K' },
  { id: 'magewell-quad-hdmi', label: 'Pro Capture Quad HDMI', manufacturer: 'magewell', type: 'pcie', inputs: 4, maxResolution: '4K' },

  // AJA
  { id: 'aja-kona', label: 'Kona', manufacturer: 'aja', type: 'pcie', inputs: 4, outputs: 4, maxResolution: '4K' },
  { id: 'aja-corvid', label: 'Corvid', manufacturer: 'aja', type: 'pcie', inputs: 4, outputs: 4, maxResolution: '4K' },
  { id: 'aja-io-4k', label: 'Io 4K', manufacturer: 'aja', type: 'thunderbolt', inputs: 1, outputs: 1, maxResolution: '4K' },
  { id: 'aja-u-tap', label: 'U-TAP', manufacturer: 'aja', type: 'usb', inputs: 1, maxResolution: '1080p' },
];

// Helper to get capture card by ID
export const getCaptureCardById = (id: string): CaptureCard | undefined => {
  return CAPTURE_CARD_CATALOG.find(c => c.id === id);
};

// Helper to get capture cards by manufacturer
export const getCaptureCardsByManufacturer = (manufacturer: CaptureCard['manufacturer']): CaptureCard[] => {
  return CAPTURE_CARD_CATALOG.filter(c => c.manufacturer === manufacturer);
};

// Helper to get capture cards by type
export const getCaptureCardsByType = (type: CaptureCard['type']): CaptureCard[] => {
  return CAPTURE_CARD_CATALOG.filter(c => c.type === type);
};

// Helper to get label by ID (for dropdowns)
export const getCaptureCardLabel = (id: string): string | undefined => {
  return CAPTURE_CARDS.find(c => c.id === id)?.label;
};
