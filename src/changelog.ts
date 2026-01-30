// Changelog entries keyed by version
// Add new entries at the top when releasing a new version
export const CHANGELOG: Record<string, string[]> = {
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
  if (!changes) {
    return null;
  }

  return { version: currentVersion, changes };
}

export function markVersionSeen(version: string) {
  const LAST_SEEN_KEY = 'vsf-last-seen-version';
  localStorage.setItem(LAST_SEEN_KEY, version);
}
