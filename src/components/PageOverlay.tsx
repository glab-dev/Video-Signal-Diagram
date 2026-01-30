import { memo } from 'react';
import { useViewport } from '@xyflow/react';
import type { PageDescriptor } from '../hooks/usePageGrid';

interface PageOverlayProps {
  pages: PageDescriptor[];
}

function PageOverlayInner({ pages }: PageOverlayProps) {
  const { x, y, zoom } = useViewport();

  const patternSize = 20;
  const dotSize = 1;
  const borderWidth = 2 / zoom;
  const fontSize = 14 / zoom;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <defs>
        <pattern
          id="page-dots"
          x={0}
          y={0}
          width={patternSize}
          height={patternSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={patternSize / 2} cy={patternSize / 2} r={dotSize} fill="#333" />
        </pattern>
      </defs>

      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {pages.map((page) => (
          <g key={`${page.col},${page.row}`}>
            {/* Page background with dots */}
            <rect
              x={page.x}
              y={page.y}
              width={page.width}
              height={page.height}
              fill="#0a0a14"
              stroke="#555"
              strokeWidth={borderWidth}
            />
            {/* Dot pattern clipped to page */}
            <rect
              x={page.x}
              y={page.y}
              width={page.width}
              height={page.height}
              fill="url(#page-dots)"
            />
            {/* Page label */}
            <text
              x={page.x + 10 / zoom}
              y={page.y + 24 / zoom}
              fill="#666"
              fontSize={fontSize}
              fontFamily="sans-serif"
            >
              {page.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export const PageOverlay = memo(PageOverlayInner);
