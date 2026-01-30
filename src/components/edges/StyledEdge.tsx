import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { EdgeData } from '../EdgeLabelEditor';

interface StyledEdgeData extends EdgeData {
  showOutline?: boolean;
  dashPattern?: string;
  animated?: boolean;
}

function StyledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as StyledEdgeData | undefined;
  const showOutline = edgeData?.showOutline ?? false;
  const dashPattern = edgeData?.dashPattern ?? '';
  const animated = edgeData?.animated ?? false;

  const baseStroke = style?.stroke ?? '#888';
  const baseStrokeWidth = (style?.strokeWidth as number) ?? 2;

  return (
    <>
      {/* White outline behind the main edge */}
      {showOutline && (
        <path
          id={`${id}-outline`}
          className="react-flow__edge-path edge-outline"
          d={edgePath}
          strokeWidth={baseStrokeWidth + 3}
          stroke="white"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={dashPattern || undefined}
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeDasharray: dashPattern || undefined,
        }}
        className={animated ? 'edge-animated' : ''}
      />

      {/* Selection highlight */}
      {selected && (
        <path
          className="react-flow__edge-path edge-selection-highlight"
          d={edgePath}
          strokeWidth={baseStrokeWidth + 8}
          stroke="rgba(0, 170, 255, 0.3)"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Animated flow indicator */}
      {animated && (
        <circle r="4" fill={baseStroke as string} className="edge-flow-dot">
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: 10,
              fontWeight: 600,
              ...(labelStyle as React.CSSProperties),
            }}
            className="nodrag nopan edge-label-container"
          >
            <div
              className="edge-label-bg"
              style={{
                padding: labelBgPadding ? `${labelBgPadding[0]}px ${labelBgPadding[1]}px` : '4px 8px',
                ...(labelBgStyle as React.CSSProperties),
                borderRadius: 4,
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(StyledEdge);
