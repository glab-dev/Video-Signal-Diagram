import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Node } from '@xyflow/react';
import type { ProjectData } from '../types';
import { exportProject, importProject, saveProject, getAllProjects, loadProject, deleteProject } from '../store/db';

interface ToolbarProps {
  onAddNode: (node: Node) => void;
  projectData: ProjectData;
  onLoadProject: (project: ProjectData) => void;
  onNewProject: () => void;
}

export default function Toolbar({ onAddNode, projectData, onLoadProject, onNewProject }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const addRouterNode = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'router',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'Router',
        rows: [
          { id: uuidv4(), source: '', inOut: '1', destination: '' },
          { id: uuidv4(), source: '', inOut: '2', destination: '' },
          { id: uuidv4(), source: '', inOut: '3', destination: '' },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addProcessorNode = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'processor',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'Signal Processor',
        color: '#0088cc',
        inputs: [
          { id: uuidv4(), name: 'IN 1', connection: 'HDMI 2.0', resolution: '1920x1080@60' },
        ],
        outputs: [
          { id: uuidv4(), name: 'OUT 1', connection: 'HDMI 2.0', resolution: '1920x1080@60', destination: '' },
        ],
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addLEDWallNode = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'ledWall',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'LED Wall',
        color: '#ff6600',
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addNoteNode = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'note',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'NOTES',
        content: '',
        backgroundColor: '#ffeb3b',
      },
    };
    onAddNode(node);
  }, [onAddNode]);

  const addGenericIONode = useCallback(() => {
    const node: Node = {
      id: uuidv4(),
      type: 'genericIO',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'Device',
        color: '#00ff00',
        inputs: [{ id: uuidv4(), name: 'Input 1', type: 'Other' }],
        outputs: [{ id: uuidv4(), name: 'Output 1', type: 'Other' }],
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
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
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
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-title">Add Nodes</span>
        <button onClick={addRouterNode} title="Add Router Table">
          <span className="icon">⊞</span> Router
        </button>
        <button onClick={addProcessorNode} title="Add Signal Processor">
          <span className="icon">▣</span> Processor
        </button>
        <button onClick={addLEDWallNode} title="Add LED Wall">
          <span className="icon">▦</span> LED Wall
        </button>
        <button onClick={addGenericIONode} title="Add Generic I/O Device">
          <span className="icon">◧</span> Device
        </button>
        <button onClick={addNoteNode} title="Add Note">
          <span className="icon">📝</span> Note
        </button>
        <button onClick={handleImageImport} title="Import Image">
          <span className="icon">🖼️</span> Image
        </button>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-title">Project</span>
        <button onClick={onNewProject} title="New Project">
          <span className="icon">📄</span> New
        </button>
        <button onClick={handleSave} title="Save Project">
          <span className="icon">💾</span> Save
        </button>
        <button onClick={handleLoad} title="Load Project">
          <span className="icon">📂</span> Load
        </button>
        <button onClick={handleExport} title="Export to JSON">
          <span className="icon">📤</span> Export
        </button>
        <button onClick={handleImport} title="Import from JSON">
          <span className="icon">📥</span> Import
        </button>
        <button onClick={handleDeleteProject} title="Delete Project">
          <span className="icon">🗑️</span> Delete
        </button>
      </div>

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
