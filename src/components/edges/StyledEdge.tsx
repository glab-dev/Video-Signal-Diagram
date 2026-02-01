import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { EdgeData } from '../EdgeLabelEditor';
import { useTheme, themeEdgeColors } from '../../themes';

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

  const { theme } = useTheme();
  const edgeColors = themeEdgeColors[theme];

  const edgeData = data as StyledEdgeData | undefined;
  const showOutline = edgeData?.showOutline ?? false;
  const dashPattern = edgeData?.dashPattern ?? '';
  const animated = edgeData?.animated ?? false;

  // Use edge color from style if provided, otherwise use theme color
  const baseStroke = style?.stroke ?? edgeColors.stroke;
  const baseStrokeWidth = (style?.strokeWidth as number) ?? 2;

  // Generate unique gradient ID for holographic theme
  const gradientId = `holo-gradient-${id}`;

  return (
    <>
      {/* SVG Defs for holographic gradient */}
      {theme === 'holographic' && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
            <stop offset="0%" stopColor="#00d4ff">
              <animate attributeName="stop-color" values="#00d4ff;#9d00ff;#ff00aa;#00d4ff" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#9d00ff">
              <animate attributeName="stop-color" values="#9d00ff;#ff00aa;#00d4ff;#9d00ff" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#ff00aa">
              <animate attributeName="stop-color" values="#ff00aa;#00d4ff;#9d00ff;#ff00aa" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <filter id={`${gradientId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Invisible interaction zone for easier clicking/selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="#000"
        strokeOpacity={0}
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        className="react-flow__edge-interaction"
      />

      {/* Selection highlight (behind main edge) */}
      {selected && (
        <path
          className="react-flow__edge-path edge-selection-highlight"
          d={edgePath}
          strokeWidth={baseStrokeWidth + 8}
          stroke={edgeColors.glow}
          strokeLinecap="round"
          fill="none"
        />
      )}

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
          stroke: theme === 'holographic' ? `url(#${gradientId})` : baseStroke,
          strokeDasharray: dashPattern || undefined,
          filter: theme === 'holographic' ? `url(#${gradientId}-glow)` : undefined,
        }}
        className={animated ? 'edge-animated' : ''}
      />

      {/* Animated flow indicator */}
      {animated && (
        <circle r="4" fill={edgeColors.stroke} className="edge-flow-dot">
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
