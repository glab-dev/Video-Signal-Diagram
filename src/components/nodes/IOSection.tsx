import type { ReactNode } from 'react';

export interface IOSectionProps {
  /** Section title, e.g. "INPUTS", "OUTPUTS", "INPUT CARDS" */
  title: string;
  /** Called when the add button is clicked */
  onAdd: () => void;
  /** Label for the add button. Defaults to "+" */
  addLabel?: string;
  /** Position of the add button relative to the title */
  addPosition?: 'before' | 'after';
  /** Optional column header row */
  columnHeaders?: ReactNode;
  /** The IORow elements rendered by the parent node */
  children: ReactNode;
  /** Optional extra className */
  className?: string;
  /** Optional content to render before the rows */
  contentBefore?: ReactNode;
  /** Optional content to render after the rows */
  contentAfter?: ReactNode;
}

export default function IOSection({
  title,
  onAdd,
  addLabel = '+',
  addPosition = 'after',
  columnHeaders,
  children,
  className,
  contentBefore,
  contentAfter,
}: IOSectionProps) {
  const addButton = (
    <button className="io-section-add nodrag" onClick={onAdd} title={`Add ${title.toLowerCase()}`}>
      {addLabel}
    </button>
  );

  return (
    <div className={`io-section ${className || ''}`}>
      <div className="io-section-header">
        {addPosition === 'before' && addButton}
        <span>{title}</span>
        {addPosition === 'after' && addButton}
      </div>
      {columnHeaders && (
        <div className="io-section-columns">
          {columnHeaders}
        </div>
      )}
      {contentBefore}
      <div className="io-section-rows">
        {children}
      </div>
      {contentAfter}
    </div>
  );
}
