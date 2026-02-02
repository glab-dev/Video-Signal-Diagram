import type { Node, Edge } from '@xyflow/react';

// Connection types for video signals
export type ConnectionType =
  // Source Inputs
  | 'SDI'
  | '3G SDI'
  | '12G SDI'
  | 'HDMI'
  | 'DisplayPort'
  | 'DVI'
  // Custom
  | 'Custom';

// Grouped connector types for dropdown menus
export const CONNECTOR_GROUPS = {
  'Source Inputs': ['SDI', '3G SDI', '12G SDI', 'HDMI', 'DisplayPort', 'DVI'] as ConnectionType[],
  'Custom': ['Custom'] as ConnectionType[],
};

// Port definition for inputs/outputs
export interface Port {
  id: string;
  name: string;
  type: ConnectionType;
  customType?: string; // Used when type is 'Custom'
  handleSide?: 'left' | 'right'; // Which side the handle appears on
}

// Base node data that all nodes share
export interface BaseNodeData {
  label: string;
  color?: string;
  ipAddress?: string;  // IP address for network devices
}

// Signal Processor node - like Barco E2, Brompton
export interface ProcessorNodeData extends BaseNodeData {
  inputs: ProcessorPort[];
  outputs: ProcessorPort[];
  layout?: 'stacked' | 'sideBySide';
  visibleInputFields?: ('name' | 'connection' | 'resolution')[];
  visibleOutputFields?: ('connection' | 'resolution' | 'destination')[];
  inputColumnOrder?: ('connection' | 'name' | 'resolution')[];
  outputColumnOrder?: ('destination' | 'name' | 'resolution')[];
}

export type InputFieldType = 'connection' | 'name' | 'resolution';
export type OutputFieldType = 'destination' | 'name' | 'resolution';

export interface ProcessorPort {
  id: string;
  name: string;
  connection: string;
  resolution: string;
  destination?: string;
  spacing?: number;
}

// LED Wall node - for displaying raster images
export interface LEDWallNodeData extends BaseNodeData {
  imageUrl?: string;
  width?: number;
  height?: number;
}

// Note node - for adding notes
export interface NoteNodeData extends BaseNodeData {
  content: string;
  backgroundColor?: string;
}

// Generic I/O node - customizable inputs/outputs
export interface GenericIONodeData extends BaseNodeData {
  inputs: Port[];
  outputs: Port[];
  layout?: 'stacked' | 'sideBySide';
  cascadeLockId?: string; // ID linking nodes that move together when locked
}

export interface CardConnector {
  id: string;
  type: 'DP 1.2' | 'HDMI 2.0' | '12G SDI';
  source?: string;
  resolution?: string;
  destination?: string;
}

// Barco E3 node - contains multiple TRI COMBO cards
export interface BarcoE3NodeData extends BaseNodeData {
  cards: BarcoCard[];
  layout?: 'stacked' | 'sideBySide';
  systemColumn?: 'input' | 'output'; // Which column SYSTEM appears in (side-by-side mode)
  systemPosition?: 'top' | 'bottom'; // Where SYSTEM appears: stacked mode (top = above inputs, bottom = below outputs), side-by-side mode (top/bottom of the column)
}

export interface BarcoCard {
  id: string;
  label: string;
  cardType: 'input' | 'output' | 'system';
  connectors: CardConnector[];
  handleSide?: 'left' | 'right';
  spacing?: number;
}

// Supernode - flexible source/destination with system info
export interface SupernodePort {
  id: string;
  name: string;          // "IN 1", "OUT 1"
  connector: string;     // "HDMI", "SDI", "DP", etc.
  resolution: string;    // "1920x1080", "3840x2160", etc.
  rate: string;          // "59.94", "60", "30", etc.
  checked?: boolean;     // checkbox state
  handleSide?: 'left' | 'right';
}

export interface SupernodeData extends BaseNodeData {
  platform?: string;     // "MacBook Pro", etc.
  software?: string;     // "None", etc.
  captureCard?: string;  // "None", etc.
  inputs: SupernodePort[];
  outputs: SupernodePort[];
  layout?: 'stacked' | 'sideBySide';
  sysCollapsed?: boolean;
}

// Union type for all node data
export type NodeData =
  | ProcessorNodeData
  | LEDWallNodeData
  | NoteNodeData
  | GenericIONodeData
  | BarcoE3NodeData
  | SupernodeData;

// Custom node types (add back as node types are rebuilt)
export type CustomNodeType = 'barcoE3' | 'supernode';

// Project save data
export interface ProjectData {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

// Edge with label
export interface LabeledEdge extends Edge {
  data?: {
    label?: string;
  };
}

// Preset configuration
export interface NodePreset {
  id: string;
  name: string;
  nodeType: CustomNodeType;
  data: NodeData;
  category?: string; // Optional category for organizing in sidebar
  createdAt: number;
}

// Paper size configurations (screen-appropriate dimensions)
export interface PaperDimensions {
  width: number;
  height: number;
}

export const PAPER_SIZES: Record<string, PaperDimensions> = {
  'Letter': { width: 850, height: 1100 },       // 8.5" × 11" (scaled for screen)
  'Legal': { width: 850, height: 1400 },        // 8.5" × 14"
  'Tabloid': { width: 1100, height: 1700 },     // 11" × 17"
  'A4': { width: 840, height: 1188 },           // 210mm × 297mm (A4 ratio)
  'A3': { width: 1188, height: 1680 },          // 297mm × 420mm
  'A2': { width: 1680, height: 2376 },          // 420mm × 594mm
  'Custom': { width: 1200, height: 1200 },      // User-definable
};

export type PaperSize = keyof typeof PAPER_SIZES;
export type Orientation = 'portrait' | 'landscape';

// Gear Builder types
export interface GearConfig {
  nodeType: CustomNodeType;
  label: string;
  color: string;
  layout: 'stacked' | 'sideBySide';

  // Input/Output configuration
  inputs: GearPort[];
  outputs: GearPort[];

  // System settings
  verticalSpacing?: number;
  ipAddress?: string;

  // Extensibility - future settings can be added here
  customSettings?: Record<string, unknown>;
}

export interface GearPort {
  id: string;
  name: string;
  type?: string;        // e.g., 'HDMI', 'SDI', 'DP'
  resolution?: string;
  connection?: string;  // source/destination label
}

// Cable Tally types
export interface CableTallyItem {
  cableType: string;
  cableLength: string;
  count: number;
}

export interface CableTally {
  items: CableTallyItem[];
  totalCables: number;
}
