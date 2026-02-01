import type { ThemeId } from './ThemeContext';

// Theme class definitions for each element
export interface ThemeClasses {
  // Node container
  node: string;
  nodeSelected: string;

  // Title bar
  titlebar: string;
  titlebarText: string;

  // Section headers
  sectionInput: string;
  sectionInputText: string;
  sectionOutput: string;
  sectionOutputText: string;
  sectionSystem: string;
  sectionSystemText: string;

  // Anchors/sockets
  anchorInput: string;
  anchorOutput: string;
  anchorActive: string;

  // Drop zones
  dropzone: string;
  dropzoneActive: string;

  // Port rows
  portRow: string;

  // Form elements
  select: string;
  button: string;

  // Other elements
  resize: string;
  columnHeader: string;
  divider: string;

  // Background
  background: string;

  // Edges
  edge: string;
}

// Neon Vapor theme classes
const neonVaporClasses: ThemeClasses = {
  node: 'nv-node',
  nodeSelected: 'nv-node selected',

  titlebar: 'nv-titlebar',
  titlebarText: 'nv-titlebar-text',

  sectionInput: 'nv-section-input',
  sectionInputText: 'nv-section-input-text',
  sectionOutput: 'nv-section-output',
  sectionOutputText: 'nv-section-output-text',
  sectionSystem: 'nv-section-system',
  sectionSystemText: 'nv-section-system-text',

  anchorInput: 'nv-anchor-input',
  anchorOutput: 'nv-anchor-output',
  anchorActive: 'nv-anchor-active',

  dropzone: 'nv-dropzone',
  dropzoneActive: 'nv-dropzone-active',

  portRow: 'nv-port-row',

  select: 'nv-select',
  button: 'nv-button',

  resize: 'nv-resize',
  columnHeader: 'nv-column-header',
  divider: 'nv-divider',

  background: 'nv-background',
  edge: 'nv-edge',
};

// Circuit Board theme classes
const circuitBoardClasses: ThemeClasses = {
  node: 'cb-node',
  nodeSelected: 'cb-node selected',

  titlebar: 'cb-titlebar',
  titlebarText: 'cb-titlebar-text',

  sectionInput: 'cb-section-input',
  sectionInputText: 'cb-section-input-text',
  sectionOutput: 'cb-section-output',
  sectionOutputText: 'cb-section-output-text',
  sectionSystem: 'cb-section-system',
  sectionSystemText: 'cb-section-system-text',

  anchorInput: 'cb-anchor cb-anchor-input',
  anchorOutput: 'cb-anchor cb-anchor-output',
  anchorActive: 'cb-anchor-active',

  dropzone: 'cb-dropzone',
  dropzoneActive: 'cb-dropzone',

  portRow: 'cb-port-row',

  select: 'cb-select',
  button: 'cb-button',

  resize: 'cb-resize',
  columnHeader: 'cb-column-header',
  divider: 'cb-divider',

  background: 'cb-background',
  edge: 'cb-edge',
};

// Holographic theme classes
const holographicClasses: ThemeClasses = {
  node: 'holo-node',
  nodeSelected: 'holo-node selected',

  titlebar: 'holo-titlebar',
  titlebarText: 'holo-titlebar-text',

  sectionInput: 'holo-section-input',
  sectionInputText: 'holo-section-input-text',
  sectionOutput: 'holo-section-output',
  sectionOutputText: 'holo-section-output-text',
  sectionSystem: 'holo-section-system',
  sectionSystemText: 'holo-section-system-text',

  anchorInput: 'holo-anchor holo-anchor-input',
  anchorOutput: 'holo-anchor holo-anchor-output',
  anchorActive: 'holo-anchor-active',

  dropzone: 'holo-dropzone',
  dropzoneActive: 'holo-dropzone-active',

  portRow: 'holo-port-row',

  select: 'holo-select',
  button: 'holo-button',

  resize: 'holo-resize',
  columnHeader: 'holo-column-header',
  divider: 'holo-divider',

  background: 'holo-background',
  edge: 'holo-edge',
};

// Export all theme classes
export const themeClasses: Record<ThemeId, ThemeClasses> = {
  neonVapor: neonVaporClasses,
  circuitBoard: circuitBoardClasses,
  holographic: holographicClasses,
};

// Helper function to get classes for current theme
export function getThemeClasses(theme: ThemeId): ThemeClasses {
  return themeClasses[theme];
}

// Background colors for each theme (for canvas/page overlay)
export const themeBackgrounds: Record<ThemeId, { page: string; grid: string; dot: string }> = {
  neonVapor: {
    page: '#0a0a0f',
    grid: 'rgba(0, 245, 255, 0.03)',
    dot: 'rgba(0, 245, 255, 0.2)',
  },
  circuitBoard: {
    page: '#0d1f14',
    grid: 'rgba(0, 200, 150, 0.05)',
    dot: 'rgba(0, 200, 150, 0.15)',
  },
  holographic: {
    page: '#0a0a12',
    grid: 'rgba(157, 0, 255, 0.03)',
    dot: 'rgba(157, 0, 255, 0.15)',
  },
};

// Edge colors for each theme
export const themeEdgeColors: Record<ThemeId, { stroke: string; glow: string }> = {
  neonVapor: {
    stroke: '#00f5ff',
    glow: 'rgba(0, 245, 255, 0.8)',
  },
  circuitBoard: {
    stroke: '#00c896',
    glow: 'rgba(0, 200, 150, 0.6)',
  },
  holographic: {
    stroke: '#9d00ff',
    glow: 'rgba(157, 0, 255, 0.8)',
  },
};
