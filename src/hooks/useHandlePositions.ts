import { useLayoutEffect, useState, useCallback, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Hook for DOM-measured handle positioning.
 *
 * Measures the Y offset of registered row elements relative to the
 * node's outer container, producing a map of handle keys to Y pixel
 * positions. Used when handles must be rendered outside the scaled
 * content div (to avoid CSS transform interference).
 */
export function useHandlePositions(
  nodeRef: RefObject<HTMLDivElement | null>,
  deps: unknown[]
): {
  rowRef: (key: string) => (el: HTMLElement | null) => void;
  positions: Record<string, number>;
} {
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [positions, setPositions] = useState<Record<string, number>>({});

  const rowRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) {
        rowRefs.current.set(key, el);
      } else {
        rowRefs.current.delete(key);
      }
    },
    []
  );

  useLayoutEffect(() => {
    const measure = () => {
      const nodeEl = nodeRef.current;
      if (!nodeEl) return;

      const nodeRect = nodeEl.getBoundingClientRect();
      const newPositions: Record<string, number> = {};

      rowRefs.current.forEach((rowEl, key) => {
        if (rowEl) {
          const rowRect = rowEl.getBoundingClientRect();
          newPositions[key] = rowRect.top - nodeRect.top + rowRect.height / 2;
        }
      });

      setPositions(prev => {
        const keys = Object.keys(newPositions);
        if (keys.length !== Object.keys(prev).length) return newPositions;
        for (const k of keys) {
          if (Math.abs((prev[k] ?? -1) - newPositions[k]) > 0.5) return newPositions;
        }
        return prev;
      });
    };

    measure();
    // Remeasure after paint to catch scale transform applied by useNodeScale
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rowRef, positions };
}
