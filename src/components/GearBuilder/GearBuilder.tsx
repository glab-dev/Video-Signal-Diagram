import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GearConfig, GearPort } from '../../types';
import GearSettings from './GearSettings';
import IOCardBuilder from './IOCardBuilder';
import GearPreview from './GearPreview';

const NODE_COLORS = [
  '#4a9eff', // Blue
  '#50e3c2', // Teal
  '#ff6b6b', // Red
  '#ffd93d', // Yellow
  '#6bcb77', // Green
  '#9b59b6', // Purple
  '#ff9f43', // Orange
  '#00d9ff', // Cyan
  '#ff6b9d', // Pink
];

const DEFAULT_CONFIG: GearConfig = {
  nodeType: 'genericIO',
  label: 'New Gear',
  color: '#4a9eff',
  layout: 'stacked',
  inputs: [],
  outputs: [],
  verticalSpacing: 0,
  ipAddress: '',
  customSettings: {},
};

interface GearBuilderProps {
  onAddToCanvas: (config: GearConfig) => void;
  onSavePreset: (config: GearConfig) => void;
}

function GearBuilder({ onAddToCanvas, onSavePreset }: GearBuilderProps) {
  const [expanded, setExpanded] = useState(true);
  const [config, setConfig] = useState<GearConfig>(DEFAULT_CONFIG);

  const updateConfig = useCallback((updates: Partial<GearConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const addInput = useCallback(() => {
    const newPort: GearPort = {
      id: uuidv4(),
      name: `Input ${config.inputs.length + 1}`,
      type: 'HDMI',
      resolution: '1920x1080@60',
    };
    setConfig(prev => ({ ...prev, inputs: [...prev.inputs, newPort] }));
  }, [config.inputs.length]);

  const addOutput = useCallback(() => {
    const newPort: GearPort = {
      id: uuidv4(),
      name: `Output ${config.outputs.length + 1}`,
      type: 'HDMI',
      resolution: '1920x1080@60',
    };
    setConfig(prev => ({ ...prev, outputs: [...prev.outputs, newPort] }));
  }, [config.outputs.length]);

  const updateInput = useCallback((id: string, updates: Partial<GearPort>) => {
    setConfig(prev => ({
      ...prev,
      inputs: prev.inputs.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const updateOutput = useCallback((id: string, updates: Partial<GearPort>) => {
    setConfig(prev => ({
      ...prev,
      outputs: prev.outputs.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const removeInput = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      inputs: prev.inputs.filter(p => p.id !== id),
    }));
  }, []);

  const removeOutput = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      outputs: prev.outputs.filter(p => p.id !== id),
    }));
  }, []);

  const handleAddToCanvas = useCallback(() => {
    onAddToCanvas(config);
  }, [config, onAddToCanvas]);

  const handleSavePreset = useCallback(() => {
    onSavePreset(config);
  }, [config, onSavePreset]);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return (
    <div className="gear-builder-section">
      <div
        className="category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? '▼' : '▶'} Gear Builder</span>
      </div>

      {expanded && (
        <div className="gear-builder-content">
          <div className="gear-builder-main">
            <div className="gear-settings-panel">
              <GearSettings
                config={config}
                onUpdate={updateConfig}
                colors={NODE_COLORS}
              />

              <IOCardBuilder
                label="INPUTS"
                ports={config.inputs}
                onAdd={addInput}
                onUpdate={updateInput}
                onRemove={removeInput}
              />

              <IOCardBuilder
                label="OUTPUTS"
                ports={config.outputs}
                onAdd={addOutput}
                onUpdate={updateOutput}
                onRemove={removeOutput}
              />
            </div>

            <div className="gear-preview-panel">
              <GearPreview config={config} />
            </div>
          </div>

          <div className="gear-builder-actions">
            <button
              className="gear-btn primary"
              onClick={handleAddToCanvas}
            >
              Add to Canvas
            </button>
            <button
              className="gear-btn secondary"
              onClick={handleSavePreset}
            >
              Save Preset
            </button>
            <button
              className="gear-btn tertiary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GearBuilder;
