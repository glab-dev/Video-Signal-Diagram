import { useState, useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import { useCableTally } from '../hooks/useCableTally';

interface CableTallySectionProps {
  edges: Edge[];
}

export default function CableTallySection({ edges }: CableTallySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const tally = useCableTally(edges);

  const handleCopyToClipboard = useCallback(() => {
    const lines = ['CABLE TALLY', '-----------'];

    tally.items.forEach(item => {
      lines.push(`${item.cableType} - ${item.cableLength}: ${item.count}`);
    });

    lines.push('-----------');
    lines.push(`Total: ${tally.totalCables} cables`);

    navigator.clipboard.writeText(lines.join('\n'));
  }, [tally]);

  return (
    <div className="cable-tally-section">
      <div
        className="category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? '▼' : '▶'} Cable Tally</span>
      </div>

      {expanded && (
        <div className="cable-tally-content">
          {tally.items.length > 0 ? (
            <>
              <table className="cable-tally-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Length</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {tally.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.cableType}</td>
                      <td>{item.cableLength}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="cable-tally-footer">
                <span className="cable-tally-total">
                  Total: {tally.totalCables} cable{tally.totalCables !== 1 ? 's' : ''}
                </span>
                <button
                  className="cable-tally-copy-btn"
                  onClick={handleCopyToClipboard}
                  title="Copy to clipboard"
                >
                  Copy List
                </button>
              </div>
            </>
          ) : (
            <div className="cable-tally-empty">
              No cable information available.
              <br />
              <span className="cable-tally-hint">
                Add cable type and length when creating connections.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
