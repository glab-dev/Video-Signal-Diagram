import { useCallback, useState } from 'react';
import { PAPER_SIZES, type PaperSize, type Orientation } from '../types';

interface UseCanvasSettingsParams {
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
}

export function useCanvasSettings({ reactFlowWrapper, screenToFlowPosition, setViewport }: UseCanvasSettingsParams) {
  // Paper size state with localStorage persistence
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    const saved = localStorage.getItem('paperSize');
    return (saved as PaperSize) || 'Tabloid';
  });

  const [orientation, setOrientation] = useState<Orientation>(() => {
    const saved = localStorage.getItem('orientation');
    return (saved as Orientation) || 'landscape';
  });

  const [customWidth, setCustomWidth] = useState<number>(() => {
    const saved = localStorage.getItem('customWidth');
    return saved ? parseInt(saved) : 1200;
  });

  const [customHeight, setCustomHeight] = useState<number>(() => {
    const saved = localStorage.getItem('customHeight');
    return saved ? parseInt(saved) : 1200;
  });

  const [showMiniMap, setShowMiniMap] = useState<boolean>(() => {
    const saved = localStorage.getItem('showMiniMap');
    return saved === 'true';
  });

  const [showRatioOverlay, setShowRatioOverlay] = useState<boolean>(false);

  // Paper size change handlers
  const handlePaperSizeChange = useCallback((size: PaperSize) => {
    setPaperSize(size);
    localStorage.setItem('paperSize', size);
  }, []);

  const handleOrientationChange = useCallback((orient: Orientation) => {
    setOrientation(orient);
    localStorage.setItem('orientation', orient);
  }, []);

  const handleCustomSizeChange = useCallback((width: number, height: number) => {
    setCustomWidth(width);
    setCustomHeight(height);
    localStorage.setItem('customWidth', width.toString());
    localStorage.setItem('customHeight', height.toString());
  }, []);

  // Get the center of the current viewport in flow coordinates
  const getViewportCenter = useCallback(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return { x: 100, y: 100 };
    const rect = wrapper.getBoundingClientRect();
    return screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [screenToFlowPosition, reactFlowWrapper]);

  const toggleMiniMap = useCallback(() => {
    setShowMiniMap(prev => {
      const newValue = !prev;
      localStorage.setItem('showMiniMap', newValue.toString());
      return newValue;
    });
  }, []);

  // Calculate canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    let dims = PAPER_SIZES[paperSize];

    // Use custom dimensions if Custom is selected
    if (paperSize === 'Custom') {
      dims = { width: customWidth, height: customHeight };
    }

    // Apply orientation
    if (orientation === 'landscape') {
      return {
        width: Math.max(dims.width, dims.height),
        height: Math.min(dims.width, dims.height)
      };
    }
    return {
      width: Math.min(dims.width, dims.height),
      height: Math.max(dims.width, dims.height)
    };
  }, [paperSize, orientation, customWidth, customHeight]);

  const canvasDimensions = getCanvasDimensions();

  // Center the origin page in the viewport
  const centerPage = useCallback(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const zoom = 0.75;
    const containerWidth = wrapper.clientWidth;
    const containerHeight = wrapper.clientHeight;

    const x = (containerWidth - canvasDimensions.width * zoom) / 2;
    const y = (containerHeight - canvasDimensions.height * zoom) / 2;

    setViewport({ x, y, zoom });
  }, [canvasDimensions.width, canvasDimensions.height, setViewport, reactFlowWrapper]);

  return {
    paperSize,
    orientation,
    customWidth,
    customHeight,
    showMiniMap,
    showRatioOverlay,
    setShowRatioOverlay,
    handlePaperSizeChange,
    handleOrientationChange,
    handleCustomSizeChange,
    getViewportCenter,
    toggleMiniMap,
    canvasDimensions,
    centerPage,
  };
}
