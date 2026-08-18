import React, { useMemo, useState, useEffect } from 'react';
import { Note, CanvasTheme } from '../types';
import { getNoteGraphConnections, NoteConnection } from '../lib/rustGraph';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';

interface NoteConnectionsProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  themeMode?: CanvasTheme;
  viewportBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Calculates the exact point where a line from center to target intersects
 * the outer border bounding box of a rectangular note card.
 */
function getRectEdgePoint(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  w: number,
  h: number,
  padding: number = 4
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };

  const halfW = w / 2 + padding;
  const halfH = h / 2 + padding;

  const scaleX = Math.abs(halfW / dx);
  const scaleY = Math.abs(halfH / dy);

  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

const NoteConnectionsComponent: React.FC<NoteConnectionsProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  themeMode = 'dark',
  viewportBounds,
}) => {
  const [connections, setConnections] = useState<NoteConnection[]>([]);

  const connectionsContentKey = useMemo(
    () => (notes || []).map((n) => `${n.id}:${n.title}:${n.updatedAt || n.createdAt}`).join(';'),
    [notes]
  );

  // Asynchronously compute graph connections via native Rust engine without blocking UI thread
  useEffect(() => {
    let isMounted = true;
    const timer = window.setTimeout(() => {
      getNoteGraphConnections(notes || []).then((res) => {
        if (isMounted) {
          setConnections(res || []);
        }
      });
    }, 150);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [connectionsContentKey, notes]);

  const noteMap = useMemo(() => {
    const map = new Map<string, Note>();
    notes.forEach((n) => map.set(n.id, n));
    return map;
  }, [notes]);

  const isDarkCanvas = themeMode === 'dark';

  if (connections.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
      <defs>
        {/* Inactive Arrow Head */}
        <marker
          id="arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isDarkCanvas ? '#94a3b8' : '#64748b'} />
        </marker>
        {/* Active / Highlighted Arrow Head */}
        <marker
          id="arrow-head-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isDarkCanvas ? '#60a5fa' : '#2563eb'} />
        </marker>
      </defs>

      {connections.map((conn, idx) => {
        const fromNote = noteMap.get(conn.fromNoteId);
        const toNote = noteMap.get(conn.toNoteId);

        if (!fromNote || !toNote) return null;

        const fromWidth = fromNote.width || DEFAULT_NOTE_WIDTH;
        const fromHeight = fromNote.height || DEFAULT_NOTE_HEIGHT;
        const toWidth = toNote.width || DEFAULT_NOTE_WIDTH;
        const toHeight = toNote.height || DEFAULT_NOTE_HEIGHT;

        // Viewport culling: do not render SVG path if both ends are completely off-screen
        if (viewportBounds) {
          const fromVisible =
            fromNote.x + fromWidth >= viewportBounds.minX &&
            fromNote.x <= viewportBounds.maxX &&
            fromNote.y + fromHeight >= viewportBounds.minY &&
            fromNote.y <= viewportBounds.maxY;

          const toVisible =
            toNote.x + toWidth >= viewportBounds.minX &&
            toNote.x <= viewportBounds.maxX &&
            toNote.y + toHeight >= viewportBounds.minY &&
            toNote.y <= viewportBounds.maxY;

          if (!fromVisible && !toVisible) {
            return null;
          }
        }

        // Calculate center points in world coordinates
        const fromCenterX = fromNote.x + fromWidth / 2;
        const fromCenterY = fromNote.y + fromHeight / 2;
        const toCenterX = toNote.x + toWidth / 2;
        const toCenterY = toNote.y + toHeight / 2;

        // Compute exact edge intersection points on note card borders
        const fromEdge = getRectEdgePoint(
          fromCenterX,
          fromCenterY,
          toCenterX,
          toCenterY,
          fromWidth,
          fromHeight
        );
        const toEdge = getRectEdgePoint(
          toCenterX,
          toCenterY,
          fromCenterX,
          fromCenterY,
          toWidth,
          toHeight
        );

        // Use world coordinates directly (parent div applies viewport zoom & pan transform)
        const worldFromX = fromEdge.x;
        const worldFromY = fromEdge.y;
        const worldToX = toEdge.x;
        const worldToY = toEdge.y;

        const isHighlighted = selectedNoteId === conn.fromNoteId || selectedNoteId === conn.toNoteId;

        // Calculate cubic bezier control points
        const dx = worldToX - worldFromX;
        const dy = worldToY - worldFromY;
        const controlOffset = Math.min(Math.hypot(dx, dy) * 0.3, 150);

        const cx1 = worldFromX + (dx > 0 ? controlOffset : -controlOffset);
        const cy1 = worldFromY;
        const cx2 = worldToX - (dx > 0 ? controlOffset : -controlOffset);
        const cy2 = worldToY;

        const pathData = `M ${worldFromX} ${worldFromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${worldToX} ${worldToY}`;
        const midX = (worldFromX + worldToX) / 2;
        const midY = (worldFromY + worldToY) / 2;

        // Theme adaptive stroke colors
        const strokeColor = isHighlighted
          ? isDarkCanvas
            ? '#60a5fa'
            : '#2563eb'
          : isDarkCanvas
          ? '#64748b'
          : '#94a3b8';

        // Theme adaptive badge colors
        const badgeFill = isDarkCanvas
          ? isHighlighted
            ? '#1e293b'
            : '#0f172a'
          : isHighlighted
          ? '#eff6ff'
          : '#ffffff';

        const badgeStroke = isHighlighted
          ? '#3b82f6'
          : isDarkCanvas
          ? '#334155'
          : '#cbd5e1';

        const badgeTextColor = isHighlighted
          ? isDarkCanvas
            ? '#93c5fd'
            : '#1d4ed8'
          : isDarkCanvas
          ? '#cbd5e1'
          : '#475569';

        const labelText = conn.label || toNote.title || 'Note';

        return (
          <g key={`${conn.fromNoteId}-${conn.toNoteId}-${idx}`} className="group pointer-events-auto">
            <path
              d={pathData}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeDasharray={isHighlighted ? undefined : '6, 6'}
              markerEnd={isHighlighted ? 'url(#arrow-head-active)' : 'url(#arrow-head)'}
              className="transition-colors duration-150 opacity-70 hover:opacity-100 hover:stroke-blue-500 cursor-pointer"
              onClick={() => onSelectNote(conn.toNoteId)}
            />
            {/* Reference Badge on connection line */}
            <g
              transform={`translate(${midX}, ${midY})`}
              className="cursor-pointer select-none"
              onClick={() => onSelectNote(conn.toNoteId)}
            >
              <rect
                x="-42"
                y="-12"
                width="84"
                height="24"
                rx="12"
                fill={badgeFill}
                stroke={badgeStroke}
                strokeWidth="1.5"
                className="shadow-sm transition-colors"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill={badgeTextColor}
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="600"
              >
                @{labelText.length > 8 ? labelText.slice(0, 8) + '…' : labelText}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

export const NoteConnections = React.memo(NoteConnectionsComponent);

