// Changelog entries keyed by version
// Add new entries at the top when releasing a new version
export const CHANGELOG: Record<string, string[]> = {
  '1.0.25': [
    'Render NodeResizer after content div for reliable handle interaction, widen zoom range',
  ],
  '1.0.24': [
    'Revert to transform scaling with explicit z-index stacking, widen zoom range',
  ],
  '1.0.23': [
    'Switch node scaling from transform to CSS zoom',
  ],
  '1.0.22': [
    'Collapse scaled content layout overflow blocking resize handles',
  ],
  '1.0.21': [
    'Improve resize handle interactivity on small nodes',
  ],
  '1.0.20': [
    'Use setNodes for group resize to properly update edge paths',
  ],
  '1.0.19': [
    'Measure actual content dimensions for node scaling on file load',
  ],
  '1.0.18': [
    'Merge duplicate whats-new-popup CSS rules and prevent flex collapse',
  ],
  '1.0.17': [
    'Group resize, viewport-aware node placement, and cumulative changelog',
  ],
  '1.0.16': [
    'Remove unused variables breaking production build',
  ],
  '1.0.15': [
    'Add sidebar customization, category overrides, and node categories',
  ],
  '1.0.14': [
    'Add inline editing for node titles and source/destination dropdowns, auto-generate changelog',
  ],
  '1.0.13': [
    'Collapsible and reorderable sections in right panel',
    'Drag-and-drop section reordering with drag handles',
  ],
  '1.0.12': [
    'Renamed Cable Tally to Project Tally with equipment categories',
  ],
  '1.0.11': [
    'Gear Builder for planning equipment lists',
    'Cable Tally feature for tracking cable requirements',
  ],
  '1.0.10': [
    'Edge color propagation from source nodes',
    'Pass-through device support for edge coloring',
  ],
  '1.0.9': [
    'Fixed cascade lock not appearing on copy/paste',
  ],
  '1.0.8': [
    'What\'s New changelog popup in the right panel',
  ],
  '1.0.7': [
    'Added destination dropdown to all output/destination fields',
    'Added source name dropdown to CardNode, BarcoE3Node, RouterNode',
    'Added source name dropdown for switcher/processor inputs',
    'Added reset functionality to BarcoE3Node preset menu',
  ],
  '1.0.6': [
    'Edge label editor with cable type and length fields',
    'Page overlay system with paper size support',
    'Right panel for canvas settings (paper size, orientation)',
    'Copy/paste with cascade direction support',
    'Context menu with duplicate node option',
    'PNG export functionality',
    'Cascade lock for grouped GenericIO nodes',
    'Node scaling with zoom level',
    'Preset export/import backup system',
    'MiniMap toggle',
  ],
};

// Compare two semver strings; returns negative if a < b, 0 if equal, positive if a > b
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

// Returns changelog entries for all versions since the last seen version, or null if already seen
export function getNewChangelog(currentVersion: string): { version: string; entries: { version: string; changes: string[] }[] } | null {
  const LAST_SEEN_KEY = 'vsf-last-seen-version';
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY);

  if (lastSeen === currentVersion) {
    return null;
  }

  // Collect all versions newer than lastSeen (or all if no lastSeen)
  const allVersions = Object.keys(CHANGELOG)
    .filter(v => !lastSeen || compareVersions(v, lastSeen) > 0)
    .filter(v => compareVersions(v, currentVersion) <= 0)
    .sort((a, b) => compareVersions(b, a)); // newest first

  const entries = allVersions.map(v => ({ version: v, changes: CHANGELOG[v] }));

  if (entries.length === 0) {
    return { version: currentVersion, entries: [{ version: currentVersion, changes: ['App updated — enjoy the latest improvements!'] }] };
  }

  return { version: currentVersion, entries };
}

export function markVersionSeen(version: string) {
  const LAST_SEEN_KEY = 'vsf-last-seen-version';
  localStorage.setItem(LAST_SEEN_KEY, version);
}
