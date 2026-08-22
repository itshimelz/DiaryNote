import React, { useMemo, useState, useEffect } from 'react';
import { Note, CanvasTheme } from '../types';
import { getNoteGraphConnections, NoteConnection } from '../lib/rustGraph';
import { useNotesList } from '../stores/notesStore';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';

interface NoteConnectionsProps {
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
  selectedNoteId,
  onSelectNote,
  themeMode = 'dark',
  viewportBounds,
}) => {
  const [connections, setConnections] = useState<NoteConnection[]>([]);
  const notes = useNotesList();

  const connectionsContentKey = useMemo(
    () => (notes || []).map((n) => `${n.id}:${n.title}:${n.updatedAt || n.createdAt}`).join(';'),
    [notes]
  );

  // Asynchronously compute graph connections via native Rust engine without blocking UI thread.
  // ponytail: keyed on content only — raw `notes` in deps re-armed the timer (and re-shipped the
  // whole vault over IPC) on every keystroke/drag-end even when no edge-relevant field changed;
  // connectionsContentKey already covers id/title/updatedAt mutations.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionsContentKey]);

  const noteMap = useMemo(() => {
    const map = new Map<string, Note>();
    notes.forEach((n) => map.set(n.id, n));
    return map;
  }, [notes]);

  const isDarkCanvas = themeMode === 'dark';

  // Geometry is position-derived only: compute once per connections/notes change so
  // viewport-culling re-renders (every hysteresis pan commit) skip all path math.
  const edgeGeometries = useMemo(() => {
    return connections
      .map((conn, idx) => {
        const fromNote = noteMap.get(conn.fromNoteId);
        const toNote = noteMap.get(conn.toNoteId);
        if (!fromNote || !toNote) return null;

        const fromWidth = fromNote.width || DEFAULT_NOTE_WIDTH;
        const fromHeight = fromNote.height || DEFAULT_NOTE_HEIGHT;
        const toWidth = toNote.width || DEFAULT_NOTE_WIDTH;
        const toHeight = toNote.height || DEFAULT_NOTE_HEIGHT;

        const fromCenterX = fromNote.x + fromWidth / 2;
        const fromCenterY = fromNote.y + fromHeight / 2;
        const toCenterX = toNote.x + toWidth / 2;
        const toCenterY = toNote.y + toHeight / 2;

        const fromEdge = getRectEdgePoint(fromCenterX, fromCenterY, toCenterX, toCenterY, fromWidth, fromHeight);
        const toEdge = getRectEdgePoint(toCenterX, toCenterY, fromCenterX, fromCenterY, toWidth, toHeight);

        const dx = toEdge.x - fromEdge.x;
        const dy = toEdge.y - fromEdge.y;
        const controlOffset = Math.min(Math.hypot(dx, dy) * 0.3, 150);

        const cx1 = fromEdge.x + (dx > 0 ? controlOffset : -controlOffset);
        const cx2 = toEdge.x - (dx > 0 ? controlOffset : -controlOffset);

        const labelText = conn.label || toNote.title || 'Note';

        return {
          key: `${conn.fromNoteId}-${conn.toNoteId}-${idx}`,
          conn,
          pathData: `M ${fromEdge.x} ${fromEdge.y} C ${cx1} ${fromEdge.y}, ${cx2} ${toEdge.y}, ${toEdge.x} ${toEdge.y}`,
          midX: (fromEdge.x + toEdge.x) / 2,
          midY: (fromEdge.y + toEdge.y) / 2,
          labelText,
          fromBox: { x: fromNote.x, y: fromNote.y, w: fromWidth, h: fromHeight },
          toBox: { x: toNote.x, y: toNote.y, w: toWidth, h: toHeight },
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [connections, noteMap]);

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

      {edgeGeometries.map((edge) => {
        const { conn, pathData, midX, midY, labelText, fromBox, toBox } = edge;

        // Viewport culling: do not render SVG path if both ends are completely off-screen
        if (viewportBounds) {
          const fromVisible =
            fromBox.x + fromBox.w >= viewportBounds.minX &&
            fromBox.x <= viewportBounds.maxX &&
            fromBox.y + fromBox.h >= viewportBounds.minY &&
            fromBox.y <= viewportBounds.maxY;

          const toVisible =
            toBox.x + toBox.w >= viewportBounds.minX &&
            toBox.x <= viewportBounds.maxX &&
            toBox.y + toBox.h >= viewportBounds.minY &&
            toBox.y <= viewportBounds.maxY;

          if (!fromVisible && !toVisible) {
            return null;
          }
        }

        const isHighlighted = selectedNoteId === conn.fromNoteId || selectedNoteId === conn.toNoteId;

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

        return (
          <g key={edge.key} className="group pointer-events-auto">
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

export const NoteConnections = React.memo(
  NoteConnectionsComponent,
  (prevProps, nextProps) => {
    if (
      prevProps.selectedNoteId !== nextProps.selectedNoteId ||
      prevProps.themeMode !== nextProps.themeMode ||
      prevProps.onSelectNote !== nextProps.onSelectNote
    ) {
      return false;
    }
    // viewportBounds is a fresh object every parent render; compare numerically so
    // identity-only changes (e.g. hysteresis pan commits with identical bounds) skip re-render.
    const a = prevProps.viewportBounds;
    const b = nextProps.viewportBounds;
    if (!a || !b) return a === b;
    return a.minX === b.minX && a.maxX === b.maxX && a.minY === b.minY && a.maxY === b.maxY;
  }
);

