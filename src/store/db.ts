import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { ProjectData } from '../types';

const DB_NAME = 'video-signal-flow';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
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

export function importProject(jsonString: string): ProjectData {
  const data = JSON.parse(jsonString);
  // Validate basic structure
  if (!data.id || !data.name || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid project file format');
  }
  return {
    ...data,
    updatedAt: Date.now(),
  };
}
