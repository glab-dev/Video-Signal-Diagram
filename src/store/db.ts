import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectData, NodePreset } from '../types';

const DB_NAME = 'video-signal-flow';
const DB_VERSION = 4;
const STORE_NAME = 'projects';
const PRESETS_STORE_NAME = 'presets';
const PERMANENT_SOURCES_STORE_NAME = 'permanentSources';
const SIDEBAR_CUSTOMIZATION_STORE_NAME = 'sidebarCustomization';

// Category override entry that persists across all projects
export interface PermanentSource {
  id: string;
  name: string;
  color: string;
  category: 'source' | 'destination';
  createdAt: number;
}

// Sidebar customization - tracks hidden categories, hidden items, and item moves
export interface SidebarCustomization {
  id: 'main'; // Single record
  hiddenCategories: string[]; // e.g., ['utilities']
  hiddenItems: string[]; // e.g., ['sources:Mac', 'processors:Brompton S4']
  itemMoves: Record<string, string>; // e.g., { 'sources:Mac': 'destinations' } - item key to new category
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Create projects store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }

        // Create presets store if upgrading to v2+
        if (oldVersion < 2 && !db.objectStoreNames.contains(PRESETS_STORE_NAME)) {
          const presetsStore = db.createObjectStore(PRESETS_STORE_NAME, { keyPath: 'id' });
          presetsStore.createIndex('nodeType', 'nodeType');
          presetsStore.createIndex('createdAt', 'createdAt');
        }

        // Create permanent sources store if upgrading to v3+
        if (oldVersion < 3 && !db.objectStoreNames.contains(PERMANENT_SOURCES_STORE_NAME)) {
          const sourcesStore = db.createObjectStore(PERMANENT_SOURCES_STORE_NAME, { keyPath: 'id' });
          sourcesStore.createIndex('createdAt', 'createdAt');
        }

        // Create sidebar customization store if upgrading to v4+
        if (oldVersion < 4 && !db.objectStoreNames.contains(SIDEBAR_CUSTOMIZATION_STORE_NAME)) {
          db.createObjectStore(SIDEBAR_CUSTOMIZATION_STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: ProjectData): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, {
    ...project,
    updatedAt: Date.now(),
  });
}

export async function loadProject(id: string): Promise<ProjectData | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getAllProjects(): Promise<ProjectData[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'updatedAt');
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export function exportProject(project: ProjectData): string {
  return JSON.stringify(project, null, 2);
}

export function importProject(jsonString: string, fileName?: string): ProjectData {
  const data = JSON.parse(jsonString);
  // Must have nodes and edges arrays at minimum
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid project file format');
  }
  // Derive a name from the filename if provided (strip extension and underscores)
  const nameFromFile = fileName
    ? fileName.replace(/\.(vsf|json)$/i, '').replace(/_/g, ' ')
    : undefined;
  return {
    ...data,
    id: data.id || uuidv4(),
    name: nameFromFile || data.name || 'Untitled Project',
    updatedAt: Date.now(),
  };
}

// Preset Management Functions
export async function savePreset(preset: NodePreset): Promise<void> {
  const db = await getDB();
  await db.put(PRESETS_STORE_NAME, preset);
}

export async function getPresetsByType(nodeType: string): Promise<NodePreset[]> {
  const db = await getDB();
  return db.getAllFromIndex(PRESETS_STORE_NAME, 'nodeType', nodeType);
}

export async function getAllPresets(): Promise<NodePreset[]> {
  const db = await getDB();
  return db.getAll(PRESETS_STORE_NAME);
}

export async function deletePreset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PRESETS_STORE_NAME, id);
}

// Permanent Sources Management Functions
export async function savePermanentSource(source: PermanentSource): Promise<void> {
  const db = await getDB();
  await db.put(PERMANENT_SOURCES_STORE_NAME, source);
}

export async function getAllPermanentSources(): Promise<PermanentSource[]> {
  const db = await getDB();
  return db.getAll(PERMANENT_SOURCES_STORE_NAME);
}

export async function deletePermanentSource(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PERMANENT_SOURCES_STORE_NAME, id);
}

// Sidebar Customization Functions
const DEFAULT_SIDEBAR_CUSTOMIZATION: SidebarCustomization = {
  id: 'main',
  hiddenCategories: [],
  hiddenItems: [],
  itemMoves: {},
};

export async function getSidebarCustomization(): Promise<SidebarCustomization> {
  const db = await getDB();
  const customization = await db.get(SIDEBAR_CUSTOMIZATION_STORE_NAME, 'main');
  return customization || DEFAULT_SIDEBAR_CUSTOMIZATION;
}

export async function saveSidebarCustomization(customization: SidebarCustomization): Promise<void> {
  const db = await getDB();
  await db.put(SIDEBAR_CUSTOMIZATION_STORE_NAME, customization);
}

export async function resetSidebarCustomization(): Promise<void> {
  const db = await getDB();
  await db.put(SIDEBAR_CUSTOMIZATION_STORE_NAME, DEFAULT_SIDEBAR_CUSTOMIZATION);
}
