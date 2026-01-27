import type { Node, Edge } from '@xyflow/react';

// Connection types for video signals
export type ConnectionType = 'SDI' | 'HDMI' | 'DisplayPort' | 'NDI' | 'Fiber' | 'Other';

// Port definition for inputs/outputs
export interface Port {
  id: string;
  name: string;
  type: ConnectionType;
}

// Base node data that all nodes share
export interface BaseNodeData {
  label: string;
  color?: string;
}

// Router node - like BMD 20x20 in the screenshot
export interface RouterNodeData extends BaseNodeData {
  rows: RouterRow[];
}

export interface RouterRow {
  id: string;
  source: string;
  inOut: string;
  destination: string;
}

// Signal Processor node - like Barco E2, Brompton
export interface ProcessorNodeData extends BaseNodeData {
  inputs: ProcessorPort[];
  outputs: ProcessorPort[];
  layout?: 'stacked' | 'sideBySide';
  visibleInputFields?: ('name' | 'connection' | 'resolution')[];
  visibleOutputFields?: ('connection' | 'resolution' | 'destination')[];
}

export interface ProcessorPort {
  id: string;
  name: string;
  connection: string;
  resolution: string;
  destination?: string;
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
}

// Image node - for imported raster images
export interface ImageNodeData extends BaseNodeData {
  imageUrl: string;
  width?: number;
  height?: number;
}

// Card node - for Barco TRI COMBO cards
export interface CardNodeData extends BaseNodeData {
  cardType: 'input' | 'output';
  connectors: CardConnector[];
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
}

export interface BarcoCard {
  id: string;
  label: string;
  cardType: 'input' | 'output';
  connectors: CardConnector[];
  handleSide?: 'left' | 'right';
}

// Union type for all node data
export type NodeData =
  | RouterNodeData
  | ProcessorNodeData
  | LEDWallNodeData
  | NoteNodeData
  | GenericIONodeData
  | ImageNodeData
  | CardNodeData
  | BarcoE3NodeData;

// Custom node types
export type CustomNodeType =
  | 'router'
  | 'processor'
  | 'ledWall'
  | 'note'
  | 'genericIO'
  | 'image'
  | 'card'
  | 'barcoE3';

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
