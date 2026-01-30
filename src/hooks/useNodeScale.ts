import { useRef, useLayoutEffect, useState, type RefObject, type CSSProperties } from 'react';

/**
 * Hook that enables uniform proportional scaling of node content.
 *
 * Measures the content element's natural (unconstrained) dimensions
 * on mount, then applies CSS zoom when the node is resized via
 * NodeResizer (with keepAspectRatio).
 *
 * Unlike transform: scale(), CSS zoom adjusts BOTH visual AND layout
 * dimensions without creating a stacking context. This means:
 *   - No pointer-events conflicts with NodeResizer handles
 *   - No negative margins needed to collapse overflow
 *   - No z-index workarounds required
 *
 * This correctly handles nodes loaded from saved files where explicit
 * width/height from a previous resize would otherwise be misinterpreted
 * as the content's natural size.
 */
export function useNodeScale(
  measuredWidth?: number,
  measuredHeight?: number,
): { contentRef: RefObject<HTMLDivElement | null>; scaleStyle: CSSProperties } {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const naturalSize = useRef<{ w: number; h: number } | null>(null);
  const [, setTick] = useState(0);

  // Measure the content element's actual intrinsic dimensions on mount.
  // We temporarily remove sizing constraints so the content renders at
  // its natural size, then capture scrollWidth/scrollHeight.
  useLayoutEffect(() => {
    if (!naturalSize.current && contentRef.current) {
      const el = contentRef.current;

      // Save current inline styles
      const saved = {
        position: el.style.position,
        width: el.style.width,
        height: el.style.height,
        zoom: el.style.zoom,
      };

      // Remove constraints to measure intrinsic content size
      el.style.position = 'absolute';
      el.style.width = 'max-content';
      el.style.height = 'max-content';
      el.style.zoom = '1';

      naturalSize.current = {
        w: el.scrollWidth,
        h: el.scrollHeight,
      };

      // Restore original inline styles
      el.style.position = saved.position;
      el.style.width = saved.width;
      el.style.height = saved.height;
      el.style.zoom = saved.zoom;

      // Trigger re-render to apply correct scaleStyle
      setTick(t => t + 1);
    }
  }, []);

  const nw = naturalSize.current?.w ?? 0;
  const nh = naturalSize.current?.h ?? 0;

  if (!measuredWidth || !measuredHeight || nw <= 0 || nh <= 0) {
    return { contentRef, scaleStyle: {} };
  }

  const sx = measuredWidth / nw;
  const sy = measuredHeight / nh;
  const scale = Math.min(sx, sy);

  // At or near 1:1, pin to natural dimensions without scaling
  if (Math.abs(scale - 1) < 0.005) {
    return { contentRef, scaleStyle: { width: nw, height: nh } };
  }

  return {
    contentRef,
    scaleStyle: {
      width: nw,
      height: nh,
      zoom: scale,
    },
  };
}
