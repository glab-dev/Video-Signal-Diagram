import { useRef, type RefObject, type CSSProperties } from 'react';

/**
 * Hook that enables uniform proportional scaling of node content.
 *
 * Captures the node's initial auto-sized dimensions as "natural size",
 * then applies a single CSS transform: scale() factor when the node
 * is resized via NodeResizer (with keepAspectRatio).
 *
 * The content div is pinned to its natural width/height so it doesn't
 * stretch to match the parent container.
 */
export function useNodeScale(
  measuredWidth?: number,
  measuredHeight?: number,
): { contentRef: RefObject<HTMLDivElement | null>; scaleStyle: CSSProperties } {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const naturalSize = useRef<{ w: number; h: number } | null>(null);

  // Capture natural size from the first measured values (the node's auto-sized dimensions)
  if (measuredWidth && measuredHeight && !naturalSize.current) {
    naturalSize.current = { w: measuredWidth, h: measuredHeight };
  }

  const nw = naturalSize.current?.w ?? 0;
  const nh = naturalSize.current?.h ?? 0;

  if (!measuredWidth || !measuredHeight || nw <= 0 || nh <= 0) {
    return { contentRef, scaleStyle: {} };
  }

  const sx = measuredWidth / nw;
  const sy = measuredHeight / nh;
  const scale = Math.min(sx, sy);

  // Always pin width and height to natural dimensions so the content
  // div doesn't inherit the parent's (resized) dimensions
  if (Math.abs(scale - 1) < 0.005) {
    return { contentRef, scaleStyle: { width: nw, height: nh } };
  }

  return {
    contentRef,
    scaleStyle: {
      width: nw,
      height: nh,
      transformOrigin: '0 0',
      transform: `scale(${scale})`,
    },
  };
}
