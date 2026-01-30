// Changelog entries keyed by version
// Add new entries at the top when releasing a new version
export const CHANGELOG: Record<string, string[]> = {
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

// Returns the changelog entries for the current version, or null if already seen
export function getNewChangelog(currentVersion: string): { version: string; changes: string[] } | null {
  const LAST_SEEN_KEY = 'vsf-last-seen-version';
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY);

  if (lastSeen === currentVersion) {
    return null;
  }

  const changes = CHANGELOG[currentVersion];
  if (changes) {
    return { version: currentVersion, changes };
  }

  // Always show popup on version change, even without specific entries
  return { version: currentVersion, changes: ['App updated — enjoy the latest improvements!'] };
}

export function markVersionSeen(version: string) {
  const LAST_SEEN_KEY = 'vsf-last-seen-version';
  localStorage.setItem(LAST_SEEN_KEY, version);
}
