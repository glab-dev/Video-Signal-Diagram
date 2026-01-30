import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllPermanentSources, savePermanentSource, deletePermanentSource } from '../store/db';
import type { PermanentSource } from '../store/db';
import { v4 as uuidv4 } from 'uuid';

export interface PermanentSourcesContextValue {
  sources: PermanentSource[];
  addSource: (name: string, color: string, category: 'source' | 'destination') => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  updateSource: (id: string, name: string, color: string, category: 'source' | 'destination') => Promise<void>;
  loading: boolean;
}

export const PermanentSourcesContext = createContext<PermanentSourcesContextValue>({
  sources: [],
  addSource: async () => {},
  removeSource: async () => {},
  updateSource: async () => {},
  loading: true,
});

export function usePermanentSourcesProvider(): PermanentSourcesContextValue {
  const [sources, setSources] = useState<PermanentSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Load sources on mount
  useEffect(() => {
    getAllPermanentSources()
      .then(setSources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addSource = useCallback(async (name: string, color: string, category: 'source' | 'destination') => {
    // Check if already exists with same name - update category if so
    const existing = sources.find(s => s.name === name);
    if (existing) {
      const updated: PermanentSource = { ...existing, color, category };
      await savePermanentSource(updated);
      setSources(prev => prev.map(s => s.id === existing.id ? updated : s).sort((a, b) => a.name.localeCompare(b.name)));
      return;
    }

    const newSource: PermanentSource = {
      id: uuidv4(),
      name,
      color,
      category,
      createdAt: Date.now(),
    };
    await savePermanentSource(newSource);
    setSources(prev => [...prev, newSource].sort((a, b) => a.name.localeCompare(b.name)));
  }, [sources]);

  const removeSource = useCallback(async (id: string) => {
    await deletePermanentSource(id);
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSource = useCallback(async (id: string, name: string, color: string, category: 'source' | 'destination') => {
    const existing = sources.find(s => s.id === id);
    if (existing) {
      const updated: PermanentSource = { ...existing, name, color, category };
      await savePermanentSource(updated);
      setSources(prev => prev.map(s => s.id === id ? updated : s).sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [sources]);

  return { sources, addSource, removeSource, updateSource, loading };
}

export function usePermanentSources(): PermanentSourcesContextValue {
  return useContext(PermanentSourcesContext);
}
