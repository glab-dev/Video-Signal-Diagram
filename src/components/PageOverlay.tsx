import { memo } from 'react';
import { useViewport } from '@xyflow/react';
import type { PageDescriptor } from '../hooks/usePageGrid';
import type { PaperSize } from '../types';

interface PageOverlayProps {
  pages: PageDescriptor[];
  showRatioOverlay?: boolean;
  paperSize?: PaperSize;
}

function PageOverlayInner({ pages, showRatioOverlay, paperSize }: PageOverlayProps) {
  const { x, y, zoom } = useViewport();

  const patternSize = 20;
  const dotSize = 1;
  const borderWidth = 2 / zoom;
  const fontSize = 14 / zoom;

  // Calculate the ratio overlay dimensions
  const getRatioOverlay = () => {
    if (!showRatioOverlay || pages.length === 0 || !paperSize) return null;

    // Get total bounds of all pages
    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));

    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;

    // Get single page dimensions (all pages should be same size)
    const pageWidth = pages[0].width;
    const pageHeight = pages[0].height;

    // The paper aspect ratio
    const paperAspect = pageWidth / pageHeight;

    // Calculate how large the paper outline should be to cover all pages
    // while maintaining the paper's aspect ratio
    let overlayWidth: number;
    let overlayHeight: number;

    // Determine which dimension to fill
    const totalAspect = totalWidth / totalHeight;

    if (totalAspect > paperAspect) {
      // Total area is wider than paper ratio - fit to width
      overlayWidth = totalWidth;
      overlayHeight = totalWidth / paperAspect;
    } else {
      // Total area is taller than paper ratio - fit to height
      overlayHeight = totalHeight;
      overlayWidth = totalHeight * paperAspect;
    }

    // Center the overlay over all pages
    const centerX = minX + totalWidth / 2;
    const centerY = minY + totalHeight / 2;
    const overlayX = centerX - overlayWidth / 2;
    const overlayY = centerY - overlayHeight / 2;

    return { x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight };
  };

  const ratioOverlay = getRatioOverlay();

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

        {/* Ratio overlay outline */}
        {ratioOverlay && (
          <rect
            x={ratioOverlay.x}
            y={ratioOverlay.y}
            width={ratioOverlay.width}
            height={ratioOverlay.height}
            fill="none"
            stroke="#00bfff"
            strokeWidth={3 / zoom}
            strokeDasharray={`${10 / zoom} ${5 / zoom}`}
          />
        )}
      </g>
    </svg>
  );
}

export const PageOverlay = memo(PageOverlayInner);
