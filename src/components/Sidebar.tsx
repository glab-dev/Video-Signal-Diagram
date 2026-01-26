import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node } from '@xyflow/react';
import type { ProjectData } from '../types';
import { exportProject, importProject, saveProject, getAllProjects, loadProject, deleteProject } from '../store/db';

interface SidebarProps {
  onAddNode: (node: Node) => void;
  projectData: ProjectData;
  onLoadProject: (project: ProjectData) => void;
  onNewProject: () => void;
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
          { name: 'Port 1', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 2', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 3', connection: 'Ethernet', resolution: 'LED Data' },
          { name: 'Port 4', connection: 'Ethernet', resolution: 'LED Data' },
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
    ],
  },
  // Sources
  sources: {
    label: 'Sources',
    items: [
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

export default function Sidebar({ onAddNode, projectData, onLoadProject, onNewProject }: SidebarProps) {
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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

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

  const handleSave = useCallback(async () => {
    await saveProject(projectData);
    alert('Project saved!');
  }, [projectData]);

  const handleLoad = useCallback(async () => {
    const projects = await getAllProjects();
    if (projects.length === 0) {
      alert('No saved projects found');
      return;
    }
    const projectList = projects.map((p, i) => `${i + 1}. ${p.name} (${new Date(p.updatedAt).toLocaleDateString()})`).join('\n');
    const choice = prompt(`Select project number:\n${projectList}`);
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < projects.length) {
        const project = await loadProject(projects[index].id);
        if (project) {
          onLoadProject(project);
        }
      }
    }
  }, [onLoadProject]);

  const handleExport = useCallback(() => {
    const json = exportProject(projectData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectData.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectData]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const project = importProject(e.target?.result as string);
            onLoadProject(project);
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
          <button onClick={handleSave} title="Save Project">Save</button>
          <button onClick={handleLoad} title="Load Project">Load</button>
          <button onClick={handleExport} title="Export JSON">Export</button>
          <button onClick={handleImport} title="Import JSON">Import</button>
          <button onClick={handleDeleteProject} title="Delete">Delete</button>
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
      {Object.entries(EQUIPMENT_PRESETS).map(([key, category]) => (
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
            </div>
          )}
        </div>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
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
