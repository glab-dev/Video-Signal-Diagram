import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';

export interface IORowProps {
  /** Unique handle ID for React Flow connection (must be unique per node) */
  handleId: string;
  /** Whether this row is an input (target handle) or output (source handle) */
  direction: 'input' | 'output';
  /** Which side the handle appears on. Defaults: input=left, output=right */
  handleSide?: 'left' | 'right';
  /** Called when the remove button is clicked */
  onRemove: () => void;
  /** The node-specific field content to render inside the row */
  children: ReactNode;
  /** Optional extra className for the row div */
  className?: string;
}

export default function IORow({
  handleId,
  direction,
  handleSide,
  onRemove,
  children,
  className,
}: IORowProps) {
  const side = handleSide ?? (direction === 'input' ? 'left' : 'right');
  const handleType = direction === 'input' ? 'target' : 'source';
  const position = side === 'left' ? Position.Left : Position.Right;

  const handle = (
    <Handle
      type={handleType}
      position={position}
      id={handleId}
      className={`row-handle row-handle-${side}`}
    />
  );

  const removeBtn = (
    <button
      className="io-row-remove nodrag"
      onClick={onRemove}
      title="Remove row"
    >
      ×
    </button>
  );

  return (
    <div className={`io-row ${className || ''}`}>
      {side === 'left' ? handle : removeBtn}
      {children}
      {side === 'left' ? removeBtn : handle}
    </div>
  );
}
