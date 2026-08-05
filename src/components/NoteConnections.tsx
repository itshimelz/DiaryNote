import React from 'react';
import { Note, CanvasTransform } from '../types';
import { extractNoteConnections } from '../lib/markdownMention';

interface NoteConnectionsProps {
  notes: Note[];
  transform: CanvasTransform;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
}

export const NoteConnections: React.FC<NoteConnectionsProps> = ({
  notes,
  transform,
  selectedNoteId,
  onSelectNote,
}) => {
  const connections = extractNoteConnections(notes);
  if (connections.length === 0) return null;

  const noteMap = new Map<string, Note>();
  notes.forEach((n) => noteMap.set(n.id, n));

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
      <defs>
        <marker
          id="arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#737373" />
        </marker>
        <marker
          id="arrow-head-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
      </defs>

      {connections.map((conn, idx) => {
        const fromNote = noteMap.get(conn.fromId);
        const toNote = noteMap.get(conn.toId);

        if (!fromNote || !toNote) return null;

        // Calculate center points in world coordinates
        const fromX = fromNote.x + fromNote.width / 2;
        const fromY = fromNote.y + fromNote.height / 2;
        const toX = toNote.x + toNote.width / 2;
        const toY = toNote.y + toNote.height / 2;

        // Convert world coords to screen space
        const screenFromX = fromX * transform.zoom + transform.x;
        const screenFromY = fromY * transform.zoom + transform.y;
        const screenToX = toX * transform.zoom + transform.x;
        const screenToY = toY * transform.zoom + transform.y;

        const isHighlighted = selectedNoteId === conn.fromId || selectedNoteId === conn.toId;

        // Calculate cubic bezier control points
        const dx = screenToX - screenFromX;
        const dy = screenToY - screenFromY;
        const controlOffset = Math.min(Math.hypot(dx, dy) * 0.3, 150);

        const cx1 = screenFromX + (dx > 0 ? controlOffset : -controlOffset);
        const cy1 = screenFromY;
        const cx2 = screenToX - (dx > 0 ? controlOffset : -controlOffset);
        const cy2 = screenToY;

        const pathData = `M ${screenFromX} ${screenFromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${screenToX} ${screenToY}`;
        const midX = (screenFromX + screenToX) / 2;
        const midY = (screenFromY + screenToY) / 2;

        return (
          <g key={`${conn.fromId}-${conn.toId}-${idx}`} className="group pointer-events-auto">
            <path
              d={pathData}
              fill="none"
              stroke={isHighlighted ? '#60a5fa' : '#525252'}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeDasharray={isHighlighted ? undefined : '6, 6'}
              markerEnd={isHighlighted ? 'url(#arrow-head-active)' : 'url(#arrow-head)'}
              className="transition-all duration-200 opacity-60 hover:opacity-100 hover:stroke-blue-400 cursor-pointer"
              onClick={() => onSelectNote(conn.toId)}
            />
            {/* Reference Badge on connection line */}
            <g
              transform={`translate(${midX}, ${midY})`}
              className="cursor-pointer select-none"
              onClick={() => onSelectNote(conn.toId)}
            >
              <rect
                x="-40"
                y="-12"
                width="80"
                height="22"
                rx="11"
                fill="#171717"
                stroke={isHighlighted ? '#3b82f6' : '#404040'}
                strokeWidth="1"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill={isHighlighted ? '#93c5fd' : '#a3a3a3'}
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                @{conn.toTitle.length > 8 ? conn.toTitle.slice(0, 8) + '…' : conn.toTitle}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};
