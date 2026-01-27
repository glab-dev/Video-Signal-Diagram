import RouterNode from './RouterNode';
import ProcessorNode from './ProcessorNode';
import SwitcherNode from './SwitcherNode';
import LEDWallNode from './LEDWallNode';
import NoteNode from './NoteNode';
import GenericIONode from './GenericIONode';
import ImageNode from './ImageNode';
import CardNode from './CardNode';
import BarcoE3Node from './BarcoE3Node';

export const nodeTypes = {
  router: RouterNode,
  processor: ProcessorNode,
  switcher: SwitcherNode,
  ledWall: LEDWallNode,
  note: NoteNode,
  genericIO: GenericIONode,
  image: ImageNode,
  card: CardNode,
  barcoE3: BarcoE3Node,
};

export {
  RouterNode,
  ProcessorNode,
  SwitcherNode,
  LEDWallNode,
  NoteNode,
  GenericIONode,
  ImageNode,
  CardNode,
  BarcoE3Node,
};
