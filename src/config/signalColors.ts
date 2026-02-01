// Signal Colors Configuration
// Central source of truth for signal path color coding

export interface SignalColor {
  id: string;
  label: string;
  hex: string;
  tailwindClass?: string;
}

// Signal colors for visual differentiation
export const SIGNAL_COLORS: SignalColor[] = [
  { id: 'emerald', hex: '#10b981', label: 'Emerald', tailwindClass: 'emerald' },
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan', tailwindClass: 'cyan' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue', tailwindClass: 'blue' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violet', tailwindClass: 'violet' },
  { id: 'pink', hex: '#ec4899', label: 'Pink', tailwindClass: 'pink' },
  { id: 'red', hex: '#ef4444', label: 'Red', tailwindClass: 'red' },
  { id: 'orange', hex: '#f97316', label: 'Orange', tailwindClass: 'orange' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow', tailwindClass: 'yellow' },
  { id: 'lime', hex: '#84cc16', label: 'Lime', tailwindClass: 'lime' },
  { id: 'teal', hex: '#14b8a6', label: 'Teal', tailwindClass: 'teal' },
  { id: 'indigo', hex: '#6366f1', label: 'Indigo', tailwindClass: 'indigo' },
  { id: 'fuchsia', hex: '#d946ef', label: 'Fuchsia', tailwindClass: 'fuchsia' },
];

// Section colors for node UI
export const SECTION_COLORS = {
  input: {
    accent: 'emerald',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    hoverBg: 'hover:bg-emerald-500/20',
    hex: '#10b981',
  },
  output: {
    accent: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500',
    hoverBg: 'hover:bg-amber-500/20',
    hex: '#f59e0b',
  },
  system: {
    accent: 'purple',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500',
    hoverBg: 'hover:bg-purple-500/20',
    hex: '#a855f7',
  },
} as const;

export type SectionType = keyof typeof SECTION_COLORS;

// Helper to get signal color by ID
export const getSignalColorById = (id: string): SignalColor | undefined => {
  return SIGNAL_COLORS.find(c => c.id === id);
};

// Helper to get hex color by ID
export const getSignalColorHex = (id: string): string | undefined => {
  return SIGNAL_COLORS.find(c => c.id === id)?.hex;
};
