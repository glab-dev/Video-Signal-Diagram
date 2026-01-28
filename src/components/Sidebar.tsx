import { useCallback, useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node } from '@xyflow/react';
import type { ProjectData, NodePreset } from '../types';
import { exportProject, importProject, deleteProject, getAllProjects, getAllPresets, deletePreset } from '../store/db';

// Recent files stored in localStorage
interface RecentFile {
  name: string;
  path: string;
  timestamp: number;
}

const RECENTS_KEY = 'vsf-recent-files';
const MAX_RECENTS = 5;

const getRecentFiles = (): RecentFile[] => {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToRecentFiles = (name: string, path: string) => {
  const recents = getRecentFiles();
  // Remove if already exists
  const filtered = recents.filter(r => r.path !== path);
  // Add to front
  filtered.unshift({ name, path, timestamp: Date.now() });
  // Keep only MAX_RECENTS
  const trimmed = filtered.slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
  return trimmed;
};

interface SidebarProps {
  onAddNode: (node: Node) => void;
  projectData: ProjectData;
  onLoadProject: (project: ProjectData) => void;
  onNewProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPNG: () => void;
}

// Equipment presets with their specific I/O configurations
const EQUIPMENT_PRESETS = {
  // Brompton LED Processors
  brompton: {
    label: 'Brompton',
    items: [
      {
        name: 'Brompton SX40',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: '12G SDI A', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: '12G SDI B', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'HDMI 2.0', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'DP 1.2', connection: 'DisplayPort', resolution: '3840x2160@60' },
        ],
        outputs: [
          { name: 'A', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'B', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'C', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'D', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
      {
        name: 'Brompton S8',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: 'HDMI', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'DVI', connection: 'DVI', resolution: '1920x1200@60' },
        ],
        outputs: [
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 2', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
      {
        name: 'Brompton M2',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: 'HDMI', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 2', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
      {
        name: 'Brompton S4',
        type: 'processor',
        color: '#8B0000',
        inputs: [
          { name: 'HDMI', connection: 'HDMI 1.4', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
        ],
      },
    ],
  },
  // Barco Switchers
  barco: {
    label: 'Barco',
    items: [
      {
        name: 'Barco E2',
        type: 'switcher',
        color: '#006400',
        inputs: [
          { name: 'SDI 1', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 2', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 3', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 4', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'HDMI 1', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'HDMI 2', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'DP 1', connection: 'DisplayPort', resolution: '3840x2160@60' },
          { name: 'DP 2', connection: 'DisplayPort', resolution: '3840x2160@60' },
        ],
        outputs: [
          { name: 'PGM 1', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'PGM 2', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'PGM 3', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'PGM 4', connection: 'HDMI 2.0', resolution: '3840x2160@60' },
          { name: 'AUX 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'AUX 2', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
      },
      {
        name: 'Barco S3',
        type: 'switcher',
        color: '#006400',
        inputs: [
          { name: 'SDI 1', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'SDI 2', connection: '3G SDI', resolution: '1920x1080@60' },
          { name: 'HDMI 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'HDMI 2', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'PGM 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
          { name: 'PGM 2', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
      },
    ],
  },
  // Blackmagic
  blackmagic: {
    label: 'Blackmagic',
    items: [
      {
        name: 'ATEM 4 M/E',
        type: 'switcher',
        color: '#1a1a1a',
        inputs: [
          { name: 'SDI 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 2', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 3', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 4', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 5', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 6', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 7', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'SDI 8', connection: '12G SDI', resolution: '3840x2160@60' },
        ],
        outputs: [
          { name: 'PGM 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'PGM 2', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'AUX 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'AUX 2', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'M/E 1', connection: '12G SDI', resolution: '3840x2160@60' },
          { name: 'M/E 2', connection: '12G SDI', resolution: '3840x2160@60' },
        ],
      },
      {
        name: 'ATEM Mini Pro',
        type: 'switcher',
        color: '#1a1a1a',
        inputs: [
          { name: 'HDMI 1', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'HDMI 2', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'HDMI 3', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'HDMI 4', connection: 'HDMI', resolution: '1920x1080@60' },
        ],
        outputs: [
          { name: 'HDMI Out', connection: 'HDMI', resolution: '1920x1080@60' },
          { name: 'USB-C', connection: 'USB-C', resolution: '1920x1080@60' },
        ],
      },
      {
        name: 'BMD Router 20x20',
        type: 'router',
        color: '#1a1a1a',
        size: 20,
      },
      {
        name: 'BMD Router 12x12',
        type: 'router',
        color: '#1a1a1a',
        size: 12,
      },
      {
        name: 'BLACKMAGIC 12G 40X40',
        type: 'switcher',
        color: '#4a148c',
        inputs: Array.from({ length: 40 }, (_, i) => ({
          name: `IN ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
        outputs: Array.from({ length: 40 }, (_, i) => ({
          name: `OUT ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
      },
      {
        name: 'BLACKMAGIC 12G 20X20',
        type: 'switcher',
        color: '#4a148c',
        inputs: Array.from({ length: 20 }, (_, i) => ({
          name: `IN ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
        outputs: Array.from({ length: 20 }, (_, i) => ({
          name: `OUT ${i + 1}`,
          connection: 'HDMI',
          resolution: '1920x1080@60',
        })),
      },
    ],
  },
  // Sources
  sources: {
    label: 'Sources',
    items: [
      {
        name: 'Mac',
        type: 'genericIO',
        color: '#4a4a4a',
        inputs: [],
        outputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'USB-C', type: 'USB-C' },
          { name: 'Thunderbolt', type: 'USB-C' },
        ],
      },
      {
        name: 'Laptop',
        type: 'genericIO',
        color: '#4a4a4a',
        inputs: [],
        outputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'USB-C', type: 'USB-C' },
        ],
      },
      {
        name: 'Camera',
        type: 'genericIO',
        color: '#2d2d2d',
        inputs: [],
        outputs: [
          { name: 'SDI Out', type: 'SDI' },
          { name: 'HDMI Out', type: 'HDMI' },
        ],
      },
      {
        name: 'Media Server',
        type: 'genericIO',
        color: '#1a3a5c',
        inputs: [],
        outputs: [
          { name: 'SDI 1', type: 'SDI' },
          { name: 'SDI 2', type: 'SDI' },
          { name: 'SDI 3', type: 'SDI' },
          { name: 'SDI 4', type: 'SDI' },
        ],
      },
      {
        name: 'NDI Source',
        type: 'genericIO',
        color: '#5c3d1a',
        inputs: [],
        outputs: [
          { name: 'NDI', type: 'NDI' },
        ],
      },
    ],
  },
  // Destinations
  destinations: {
    label: 'Destinations',
    items: [
      {
        name: 'Monitor',
        type: 'genericIO',
        color: '#3d3d3d',
        inputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'SDI', type: 'SDI' },
        ],
        outputs: [],
      },
      {
        name: 'Projector',
        type: 'genericIO',
        color: '#2d4a2d',
        inputs: [
          { name: 'HDMI', type: 'HDMI' },
          { name: 'SDI', type: 'SDI' },
          { name: 'DVI', type: 'DVI' },
        ],
        outputs: [],
      },
      {
        name: 'LED Wall',
        type: 'ledWall',
        color: '#ff6600',
      },
      {
        name: 'Recorder',
        type: 'genericIO',
        color: '#5c1a1a',
        inputs: [
          { name: 'SDI In', type: 'SDI' },
          { name: 'HDMI In', type: 'HDMI' },
        ],
        outputs: [],
      },
    ],
  },
};

export default function Sidebar({ onAddNode, projectData, onLoadProject, onNewProject, onUndo, onRedo, canUndo, canRedo, onExportPNG }: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    brompton: true,
    barco: true,
    blackmagic: true,
    sources: true,
    destinations: true,
    basic: true,
  });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showRecents, setShowRecents] = useState(false);
  const [savedPresets, setSavedPresets] = useState<NodePreset[]>([]);

  const loadSavedPresets = useCallback(async () => {
    const presets = await getAllPresets();
    setSavedPresets(presets);
  }, []);

  // Load recent files and saved presets on mount
  useEffect(() => {
    setRecentFiles(getRecentFiles());
    loadSavedPresets();
  }, [loadSavedPresets]);

  // Listen for preset save/delete events
  useEffect(() => {
    const handlePresetChange = () => {
      loadSavedPresets();
    };

    window.addEventListener('presetSaved', handlePresetChange);
    window.addEventListener('presetDeleted', handlePresetChange);

    return () => {
      window.removeEventListener('presetSaved', handlePresetChange);
      window.removeEventListener('presetDeleted', handlePresetChange);
    };
  }, [loadSavedPresets]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const addSavedPresetNode = useCallback((preset: NodePreset) => {
    // Create a new node from saved preset data
    const node: Node = {
      id: uuidv4(),
      type: preset.nodeType,
      position: { x: 100, y: 100 },
      data: { ...preset.data },
    };
    onAddNode(node);
  }, [onAddNode]);

  const handleDeleteSavedPreset = useCallback(async (presetId: string) => {
    if (confirm('Delete this saved node configuration?')) {
      await deletePreset(presetId);
      await loadSavedPresets();
    }
  }, [loadSavedPresets]);

  const handleDragStart = useCallback((e: React.DragEvent, preset: NodePreset) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'savedPreset',
      preset: preset,
    }));
  }, []);

  const addPresetNode = useCallback((preset: typeof EQUIPMENT_PRESETS.brompton.items[0]) => {
    let node: Node;

    if (preset.type === 'processor' || preset.type === 'switcher') {
      const inputs = ('inputs' in preset ? preset.inputs : []).map(inp => ({
        id: uuidv4(),
        name: inp.name,
        connection: inp.connection,
        resolution: inp.resolution,
      }));
      const outputs = ('outputs' in preset ? preset.outputs : []).map(out => ({
        id: uuidv4(),
        name: out.name,
        connection: out.connection,
        resolution: out.resolution,
        destination: '',
      }));

      node = {
        id: uuidv4(),
        type: preset.type,
        position: { x: 100, y: 100 },
        data: {
          label: preset.name,
          color: preset.color,
          inputs,
          outputs,
        },
      };
    } else if (preset.type === 'router') {
      const size = ('size' in preset ? preset.size : 8) as number;
      const rows = Array.from({ length: size }, (_, i) => ({
        id: uuidv4(),
        source: '',
        inOut: String(i + 1),
        destination: '',
      }));

      node = {
        id: uuidv4(),
        type: 'router',
        position: { x: 100, y: 100 },
        data: {
          label: preset.name,
          color: preset.color,
          rows,
        },
      };
    } else if (preset.type === 'ledWall') {
      node = {
        id: uuidv4(),
        type: 'ledWall',
        position: { x: 100, y: 100 },
        data: {
          label: preset.name,
          color: preset.color,
        },
      };
    } else {
      // genericIO
      const inputs = ('inputs' in preset && Array.isArray(preset.inputs) ? preset.inputs : []).map((inp: { name: string; type?: string }) => ({
        id: uuidv4(),
        name: inp.name,
        type: inp.type || 'Other',
      }));
      const outputs = ('outputs' in preset && Array.isArray(preset.outputs) ? preset.outputs : []).map((out: { name: string; type?: string }) => ({
        id: uuidv4(),
        name: out.name,
        type: out.type || 'Other',
      }));

      node = {
        id: uuidv4(),
        type: 'genericIO',
        position: { x: 100, y: 100 },
        data: {
          label: preset.name,
          color: preset.color,
          inputs,
          outputs,
        },
      };
    }

    onAddNode(node);
  }, [onAddNode]);

  const addNoteNode = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'note',
      position: { x: 100, y: 100 },
      data: {
        label: 'NOTES',
        content: '',
        backgroundColor: '#ffeb3b',
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addCustomDevice = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'genericIO',
      position: { x: 100, y: 100 },
      data: {
        label: 'Custom Device',
        color: '#0088cc',
        inputs: [{ id: uuidv4(), name: 'Input 1', type: 'Other' }],
        outputs: [{ id: uuidv4(), name: 'Output 1', type: 'Other' }],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addCustomRouter = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'router',
      position: { x: 100, y: 100 },
      data: {
        label: 'Router',
        rows: Array.from({ length: 4 }, (_, i) => ({
          id: uuidv4(),
          source: '',
          inOut: String(i + 1),
          destination: '',
        })),
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addCustomSwitcher = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'switcher',
      position: { x: 100, y: 100 },
      data: {
        label: 'Switcher',
        color: '#4a148c',
        inputs: [
          { id: uuidv4(), name: 'IN 1', connection: 'HDMI', resolution: '1920x1080@60' },
          { id: uuidv4(), name: 'IN 2', connection: 'HDMI', resolution: '1920x1080@60' },
        ],
        outputs: [
          { id: uuidv4(), name: 'PGM', connection: 'HDMI', resolution: '1920x1080@60', destination: '' },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addCustomProcessor = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'processor',
      position: { x: 100, y: 100 },
      data: {
        label: 'Processor',
        color: '#0088cc',
        inputs: [
          { id: uuidv4(), name: 'IN 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { id: uuidv4(), name: 'OUT 1', connection: 'Ethernet', resolution: 'LED Data', destination: '' },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addInputCard = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'card',
      position: { x: 100, y: 100 },
      data: {
        label: 'TRI COMBO - INPUT',
        color: '#4a9eff',
        cardType: 'input',
        connectors: [
          { id: uuidv4(), type: 'DP 1.2', source: '', resolution: '3840x2160@60' },
          { id: uuidv4(), type: 'HDMI 2.0', source: '', resolution: '3840x2160@60' },
          { id: uuidv4(), type: '12G SDI', source: '', resolution: '3840x2160@60' },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addOutputCard = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'card',
      position: { x: 100, y: 100 },
      data: {
        label: 'TRI COMBO - OUTPUT',
        color: '#50e3c2',
        cardType: 'output',
        connectors: [
          { id: uuidv4(), type: 'DP 1.2', resolution: '3840x2160@60', destination: '' },
          { id: uuidv4(), type: 'HDMI 2.0', resolution: '3840x2160@60', destination: '' },
          { id: uuidv4(), type: '12G SDI', resolution: '3840x2160@60', destination: '' },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addBarcoE3 = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'barcoE3',
      position: { x: 100, y: 100 },
      data: {
        label: 'BARCO E3',
        color: '#006400',
        cards: [
          {
            id: uuidv4(),
            label: 'TRI COMBO - INPUT',
            cardType: 'input',
            connectors: [
              { id: uuidv4(), type: 'DP 1.2', source: '', resolution: '3840x2160@60' },
              { id: uuidv4(), type: 'HDMI 2.0', source: '', resolution: '3840x2160@60' },
              { id: uuidv4(), type: '12G SDI', source: '', resolution: '3840x2160@60' },
            ],
          },
          {
            id: uuidv4(),
            label: 'TRI COMBO - OUTPUT',
            cardType: 'output',
            connectors: [
              { id: uuidv4(), type: 'DP 1.2', resolution: '3840x2160@60', destination: '' },
              { id: uuidv4(), type: 'HDMI 2.0', resolution: '3840x2160@60', destination: '' },
              { id: uuidv4(), type: '12G SDI', resolution: '3840x2160@60', destination: '' },
            ],
          },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const handleSave = useCallback(() => {
    const filename = prompt('Save As:', projectData.name);
    if (filename) {
      const json = exportProject(projectData);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [projectData]);

  // Save to file using File System Access API (works with any location including Google Drive)
  const handleSaveToFile = useCallback(async () => {
    const json = exportProject(projectData);
    const fileName = `${projectData.name.replace(/\s+/g, '_')}.vsf`;

    // Try to use the File System Access API (modern browsers)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Video Signal Flow Project',
            accept: { 'application/vsf': ['.vsf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        alert('Project saved successfully!');
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          console.error('Save failed:', err);
          // Fallback to download
          fallbackDownload(json, fileName);
        }
      }
    } else {
      // Fallback for browsers without File System Access API
      fallbackDownload(json, fileName);
    }
  }, [projectData]);

  const fallbackDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'application/vsf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open file using File System Access API
  const handleOpenFile = useCallback(async () => {
    // Try to use the File System Access API (modern browsers)
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as Window & { showOpenFilePicker: (options: { types: { description: string; accept: Record<string, string[]> }[]; multiple: boolean }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [{
            description: 'Video Signal Flow Project',
            accept: { 'application/vsf': ['.vsf'], 'application/json': ['.json'] },
          }],
          multiple: false,
        });
        const file = await handle.getFile();
        const content = await file.text();
        try {
          const project = importProject(content);
          onLoadProject(project);
          // Add to recents
          const updated = addToRecentFiles(project.name || file.name, file.name);
          setRecentFiles(updated);
        } catch {
          alert('Invalid project file');
        }
      } catch (err) {
        // User cancelled
        if ((err as Error).name !== 'AbortError') {
          console.error('Open failed:', err);
          // Fallback to file input
          fileInputRef.current?.click();
        }
      }
    } else {
      // Fallback for browsers without File System Access API
      fileInputRef.current?.click();
    }
  }, [onLoadProject]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const project = importProject(e.target?.result as string);
            onLoadProject(project);
            // Add to recents
            const updated = addToRecentFiles(project.name || file.name, file.name);
            setRecentFiles(updated);
          } catch {
            alert('Invalid project file');
          }
        };
        reader.readAsText(file);
      }
      event.target.value = '';
    },
    [onLoadProject]
  );

  const handleImageImport = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          const node: Node = {
            id: uuidv4(),
            type: 'image',
            position: { x: 100, y: 100 },
            data: {
              label: file.name,
              imageUrl,
            },
          };
          onAddNode(node);
        };
        reader.readAsDataURL(file);
      }
      event.target.value = '';
    },
    [onAddNode]
  );

  const handleDeleteProject = useCallback(async () => {
    const projects = await getAllProjects();
    if (projects.length === 0) {
      alert('No saved projects found');
      return;
    }
    const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Select project number to delete:\n${projectList}`);
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < projects.length) {
        if (confirm(`Delete "${projects[index].name}"?`)) {
          await deleteProject(projects[index].id);
          alert('Project deleted');
        }
      }
    }
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Signal Flow</h2>
      </div>

      {/* Project Actions */}
      <div className="sidebar-section">
        <div className="section-title">Project</div>
        <div className="sidebar-buttons">
          <button onClick={onNewProject} title="New Project">New</button>
          <button onClick={handleOpenFile} title="Open .vsf file">Open</button>
          <button onClick={handleSaveToFile} title="Save as .vsf file">Save As</button>
          <button onClick={handleDeleteProject} title="Delete from browser">Delete</button>
        </div>
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={handleSave} title="Quick save to browser">Quick Save</button>
          <button
            onClick={() => setShowRecents(!showRecents)}
            title="Recently opened files"
            style={{ position: 'relative' }}
          >
            Recents {recentFiles.length > 0 ? `(${recentFiles.length})` : ''}
          </button>
        </div>
        {showRecents && (
          <div className="recents-dropdown">
            {recentFiles.length === 0 ? (
              <div className="recents-empty">No recent files</div>
            ) : (
              recentFiles.map((file, index) => (
                <button
                  key={index}
                  className="recents-item"
                  onClick={() => {
                    // Re-open the file picker - can't reopen same file due to browser security
                    // But show the name for reference
                    alert(`To reopen "${file.name}", use the Open button and select the file:\n\n${file.path}`);
                    setShowRecents(false);
                  }}
                  title={file.path}
                >
                  <span className="recents-name">{file.name}</span>
                  <span className="recents-date">
                    {new Date(file.timestamp).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
          <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
        </div>
        <div className="sidebar-buttons" style={{ marginTop: '4px' }}>
          <button onClick={onExportPNG} title="Export diagram as PNG image">Export PNG</button>
        </div>
      </div>

      {/* Basic Nodes */}
      <div className="sidebar-section">
        <div className="category-header" onClick={() => toggleCategory('basic')}>
          <span>{expandedCategories.basic ? '▼' : '▶'} Basic Nodes</span>
        </div>
        {expandedCategories.basic && (
          <div className="category-items">
            <button className="node-btn" onClick={addCustomDevice}>
              <span className="node-icon" style={{ background: '#0088cc' }}></span>
              Custom Device
            </button>
            <button className="node-btn" onClick={addCustomRouter}>
              <span className="node-icon" style={{ background: '#444' }}></span>
              Router
            </button>
            <button className="node-btn" onClick={addCustomSwitcher}>
              <span className="node-icon" style={{ background: '#4a148c' }}></span>
              Switcher
            </button>
            <button className="node-btn" onClick={addCustomProcessor}>
              <span className="node-icon" style={{ background: '#0088cc' }}></span>
              Processor
            </button>
            <button className="node-btn" onClick={addBarcoE3}>
              <span className="node-icon" style={{ background: '#006400' }}></span>
              Barco E3
            </button>
            <button className="node-btn" onClick={addInputCard}>
              <span className="node-icon" style={{ background: '#4a9eff' }}></span>
              Input Card
            </button>
            <button className="node-btn" onClick={addOutputCard}>
              <span className="node-icon" style={{ background: '#50e3c2' }}></span>
              Output Card
            </button>
            <button className="node-btn" onClick={addNoteNode}>
              <span className="node-icon" style={{ background: '#ffeb3b' }}></span>
              Note
            </button>
            <button className="node-btn" onClick={handleImageImport}>
              <span className="node-icon" style={{ background: '#666' }}></span>
              Image
            </button>
          </div>
        )}
      </div>

      {/* Equipment Categories */}
      {Object.entries(EQUIPMENT_PRESETS).map(([key, category]) => {
        const categorySavedPresets = savedPresets.filter(p => p.category === key);
        return (
          <div className="sidebar-section" key={key}>
            <div className="category-header" onClick={() => toggleCategory(key)}>
              <span>{expandedCategories[key] ? '▼' : '▶'} {category.label}</span>
            </div>
            {expandedCategories[key] && (
              <div className="category-items">
                {category.items.map((item, index) => (
                  <button
                    key={index}
                    className="node-btn"
                    onClick={() => addPresetNode(item as typeof EQUIPMENT_PRESETS.brompton.items[0])}
                  >
                    <span className="node-icon" style={{ background: item.color }}></span>
                    {item.name}
                  </button>
                ))}
                {categorySavedPresets.length > 0 && (
                  <>
                    <div className="saved-presets-divider">Saved Configs</div>
                    {categorySavedPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="saved-preset-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, preset)}
                      >
                        <button
                          className="node-btn"
                          onClick={() => addSavedPresetNode(preset)}
                        >
                          <span className="node-icon" style={{ background: (preset.data as { color?: string }).color || '#666' }}></span>
                          {preset.name}
                        </button>
                        <button
                          className="delete-preset-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSavedPreset(preset.id);
                          }}
                          title="Delete saved config"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept=".vsf,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
