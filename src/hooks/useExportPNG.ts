import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';

interface UseExportPNGParams {
  getNodes: () => Node[];
  projectName: string;
}

export function useExportPNG({ getNodes, projectName }: UseExportPNGParams) {
  const handleExportPNG = useCallback(() => {
    const nodesList = getNodes();

    if (nodesList.length === 0) {
      alert('No nodes to export. Add some nodes first.');
      return;
    }

    // Get bounds of all nodes
    const nodesBounds = getNodesBounds(nodesList);

    // Add padding around the bounds
    const padding = 100;
    const paddedBounds = {
      x: nodesBounds.x - padding,
      y: nodesBounds.y - padding,
      width: nodesBounds.width + padding * 2,
      height: nodesBounds.height + padding * 2,
    };

    // Calculate dimensions - use higher resolution for better quality
    const scaleFactor = 2;
    const aspectRatio = paddedBounds.width / paddedBounds.height;

    let exportWidth = Math.max(1920, paddedBounds.width);
    let exportHeight = exportWidth / aspectRatio;

    if (exportHeight < 1080) {
      exportHeight = 1080;
      exportWidth = exportHeight * aspectRatio;
    }

    const finalWidth = exportWidth * scaleFactor;
    const finalHeight = exportHeight * scaleFactor;

    const viewport = getViewportForBounds(
      paddedBounds,
      finalWidth,
      finalHeight,
      0.1,
      4,
      0
    );

    toPng(document.querySelector('.react-flow') as HTMLElement, {
      backgroundColor: '#1a1a2e',
      width: finalWidth,
      height: finalHeight,
      pixelRatio: scaleFactor,
      style: {
        width: `${finalWidth}px`,
        height: `${finalHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl: string) => {
      const a = document.createElement('a');
      a.setAttribute('download', `${projectName.replace(/\s+/g, '_')}.png`);
      a.setAttribute('href', dataUrl);
      a.click();
    }).catch((error: Error) => {
      console.error('Export failed:', error);
      alert('Failed to export PNG. Please try again.');
    });
  }, [getNodes, projectName]);

  return { handleExportPNG };
}
