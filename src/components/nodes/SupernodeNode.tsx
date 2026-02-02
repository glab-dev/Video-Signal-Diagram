import { memo, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { SupernodeData, SupernodePort, NodeData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import NodeShell from './NodeShell';
import IORow from './IORow';
import IOSection from './IOSection';
import { COLOR_NAMES } from './nodeConstants';

const PLATFORMS = ['MacBook Pro', 'PC', 'Media Server', 'Camera', 'Playback', 'Other'];
const SOFTWARE = ['None', 'Resolume', 'Disguise', 'TouchDesigner', 'OBS', 'vMix', 'Other'];
const CAPTURE_CARDS = ['None', 'Blackmagic DeckLink', 'AJA Corvid', 'Magewell', 'Other'];
const CONNECTORS = ['HDMI', 'SDI', '3G SDI', '12G SDI', 'DisplayPort', 'DVI', 'USB-C', 'Ethernet', 'NDI', 'Other'];
const RESOLUTIONS = ['1920x1080', '3840x2160', '1280x720', '4096x2160', '2560x1440', '7680x4320', 'Custom'];
const RATES = ['23.98', '24', '25', '29.97', '30', '50', '59.94', '60', '120'];

type SupernodeNodeProps = NodeProps & {
  data: SupernodeData;
};

function SupernodeNode({ id, data, selected, width }: SupernodeNodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();

  const nodeColor = data.color || '#8800ff';
  const colorName = COLOR_NAMES[nodeColor] || 'Custom';
  const sysCollapsed = data.sysCollapsed ?? false;

  const handleLoadPreset = useCallback(
    (presetData: NodeData) => {
      const sData = presetData as SupernodeData;
      updateNodeData(id, {
        label: sData.label,
        color: sData.color,
        platform: sData.platform,
        software: sData.software,
        captureCard: sData.captureCard,
        inputs: sData.inputs,
        outputs: sData.outputs,
        sysCollapsed: sData.sysCollapsed,
      });
    },
    [id, updateNodeData]
  );

  const handleReset = useCallback(() => {
    updateNodeData(id, {
      platform: undefined,
      software: undefined,
      captureCard: undefined,
      inputs: data.inputs.map(p => ({ ...p, checked: false })),
      outputs: data.outputs.map(p => ({ ...p, checked: false })),
      sysCollapsed: false,
    });
  }, [id, data.inputs, data.outputs, updateNodeData]);

  const toggleSysCollapsed = useCallback(() => {
    updateNodeData(id, { sysCollapsed: !sysCollapsed });
  }, [id, sysCollapsed, updateNodeData]);

  const updateSysField = useCallback(
    (field: 'platform' | 'software' | 'captureCard', value: string) => {
      updateNodeData(id, { [field]: value });
    },
    [id, updateNodeData]
  );

  const updatePort = useCallback(
    (side: 'inputs' | 'outputs', portId: string, field: keyof SupernodePort, value: string | boolean) => {
      const ports = data[side].map(p =>
        p.id === portId ? { ...p, [field]: value } : p
      );
      updateNodeData(id, { [side]: ports });
    },
    [id, data, updateNodeData]
  );

  const addPort = useCallback(
    (side: 'inputs' | 'outputs') => {
      const ports = data[side];
      const num = ports.length + 1;
      const prefix = side === 'inputs' ? 'IN' : 'OUT';
      const newPort: SupernodePort = {
        id: uuidv4(),
        name: `${prefix} ${num}`,
        connector: 'HDMI',
        resolution: '1920x1080',
        rate: '59.94',
        checked: false,
      };
      updateNodeData(id, { [side]: [...ports, newPort] });
    },
    [id, data, updateNodeData]
  );

  const removePort = useCallback(
    (side: 'inputs' | 'outputs', portId: string) => {
      const ports = data[side].filter(p => p.id !== portId);
      updateNodeData(id, { [side]: ports });
    },
    [id, data, updateNodeData]
  );

  const handleConfirm = useCallback(() => {
    // Confirm = deselect node (visual confirmation)
    // The node is already saved via React Flow state
  }, []);

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const nodeRef = useRef<HTMLDivElement>(null);

  const renderPortRow = (port: SupernodePort, side: 'inputs' | 'outputs') => {
    const isInput = side === 'inputs';

    const checkbox = (
      <input
        type="checkbox"
        className="supernode-checkbox nodrag"
        checked={port.checked ?? false}
        onChange={(e) => updatePort(side, port.id, 'checked', e.target.checked)}
      />
    );

    const portName = (
      <input
        className="supernode-field supernode-port-name nodrag"
        value={port.name}
        onChange={(e) => updatePort(side, port.id, 'name', e.target.value)}
      />
    );

    const connector = (
      <select
        className="supernode-field supernode-connector nodrag"
        value={port.connector}
        onChange={(e) => updatePort(side, port.id, 'connector', e.target.value)}
      >
        {CONNECTORS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    );

    const resolution = (
      <select
        className="supernode-field supernode-resolution nodrag"
        value={port.resolution}
        onChange={(e) => updatePort(side, port.id, 'resolution', e.target.value)}
      >
        {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    );

    const rate = (
      <select
        className="supernode-field supernode-rate nodrag"
        value={port.rate}
        onChange={(e) => updatePort(side, port.id, 'rate', e.target.value)}
      >
        {RATES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    );

    return (
      <IORow
        key={port.id}
        handleId={isInput ? `input-${port.id}` : `output-${port.id}`}
        direction={isInput ? 'input' : 'output'}
        onRemove={() => removePort(side, port.id)}
      >
        {isInput ? (
          <>
            {checkbox}
            {portName}
            {connector}
            {resolution}
            {rate}
          </>
        ) : (
          <>
            {rate}
            {resolution}
            {connector}
            {portName}
            {checkbox}
          </>
        )}
      </IORow>
    );
  };

  return (
    <NodeShell
      id={id}
      selected={selected}
      width={width}
      nodeType="supernode"
      nodeClassName="node-supernode"
      defaultColor="#8800ff"
      data={data}
      minWidth={700}
      minHeight={250}
      placeholder="Supernode Name"
      presetData={data}
      onLoadPreset={handleLoadPreset}
      onReset={handleReset}
      showIpRow
      ipAddress={data.ipAddress}
      onIpChange={(value) => updateNodeData(id, { ipAddress: value })}
      showSystemsHeader={false}
      nodeRef={nodeRef}
      headerButtons={
        <>
          <span className="supernode-color-indicator nodrag">
            <span className="supernode-color-dot" style={{ backgroundColor: nodeColor }} />
            <span className="supernode-color-name">{colorName}</span>
          </span>
          <button
            className="supernode-confirm-btn nodrag"
            onClick={handleConfirm}
            title="Confirm"
          >
            ✓
          </button>
          <button
            className="supernode-delete-btn nodrag"
            onClick={handleDelete}
            title="Delete node"
          >
            ✕
          </button>
        </>
      }
    >
      <div className="supernode-content nodrag">
        {/* SYS Section */}
        <div className="supernode-sys">
          <div className="supernode-sys-header" onClick={toggleSysCollapsed}>
            <span>SYS</span>
            <span className="supernode-sys-toggle">{sysCollapsed ? '▶' : '▼'}</span>
          </div>
          {!sysCollapsed && (
            <div className="supernode-sys-body">
              <div className="supernode-sys-row">
                <label>Platform</label>
                <select
                  className="supernode-sys-select nodrag"
                  value={data.platform || ''}
                  onChange={(e) => updateSysField('platform', e.target.value)}
                >
                  <option value="">Select...</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="supernode-sys-row">
                <label>Software</label>
                <select
                  className="supernode-sys-select nodrag"
                  value={data.software || 'None'}
                  onChange={(e) => updateSysField('software', e.target.value)}
                >
                  {SOFTWARE.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="supernode-sys-row">
                <label>Capture Card</label>
                <select
                  className="supernode-sys-select nodrag"
                  value={data.captureCard || 'None'}
                  onChange={(e) => updateSysField('captureCard', e.target.value)}
                >
                  {CAPTURE_CARDS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* IO Section - side by side */}
        <div className="supernode-io">
          <IOSection
            title="INPUTS"
            onAdd={() => addPort('inputs')}
            className="supernode-inputs"
            columnHeaders={
              <>
                <span className="io-col-header checkbox-col"></span>
                <span className="io-col-header port-col">PORT</span>
                <span className="io-col-header connector-col">CONNECTOR</span>
                <span className="io-col-header resolution-col">RES</span>
                <span className="io-col-header rate-col">RATE</span>
                <span className="io-col-header action-col"></span>
              </>
            }
          >
            {data.inputs.map(port => renderPortRow(port, 'inputs'))}
          </IOSection>

          <IOSection
            title="OUTPUTS"
            onAdd={() => addPort('outputs')}
            addPosition="before"
            className="supernode-outputs"
            columnHeaders={
              <>
                <span className="io-col-header action-col"></span>
                <span className="io-col-header rate-col">RATE</span>
                <span className="io-col-header resolution-col">RES</span>
                <span className="io-col-header connector-col">CONNECTOR</span>
                <span className="io-col-header port-col">PORT</span>
                <span className="io-col-header checkbox-col"></span>
              </>
            }
          >
            {data.outputs.map(port => renderPortRow(port, 'outputs'))}
          </IOSection>
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(SupernodeNode);
