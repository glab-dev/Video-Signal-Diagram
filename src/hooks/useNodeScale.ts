import { useRef, type RefObject, type CSSProperties } from 'react';

/**
 * Hook that provides a content ref for node internals.
 *
 * Content fills the node's width via CSS (width: 100%) and
 * auto-expands vertically. No transform scaling is applied —
 * resizing the node reflows content naturally via CSS layout.
 */
export function useNodeScale(
  _measuredWidth?: number,
): { contentRef: RefObject<HTMLDivElement | null>; scaleStyle: CSSProperties } {
  const contentRef = useRef<HTMLDivElement | null>(null);

  return {
    contentRef,
    scaleStyle: {
      width: '100%',
    },
  };
}
