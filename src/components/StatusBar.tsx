import React, { useMemo } from 'react';
import { Note, CanvasTheme, GridType } from '../types';
import { calculateJournalStreak } from '../utils';
import { Database, Grid2X2, CheckSquare, Clock, FileText, Flame, CheckCircle2 } from 'lucide-react';

/**
 * Smart relative time formatter
 * Converts timestamps into human-friendly relative duration (m, h, d, w, mo, y)
 */
export function formatSmartRelativeTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return 'Just now';

  const diffMs = Date.now() - time;
  if (diffMs < 0) return 'Just now';

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 45) return 'Just now';

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

interface StatusBarProps {
  notes?: Note[];
  themeMode?: CanvasTheme;
  selectedNoteIds?: string[];
  snapToGrid?: boolean;
  gridType?: GridType;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  notes = [],
  themeMode = 'dark',
  selectedNoteIds = [],
  snapToGrid = false,
  gridType = 'dots',
}) => {
  const isDark = themeMode !== 'light';

  // Overall workspace stats & latest updated note timestamp
  const workspaceStats = useMemo(() => {
    let totalWords = 0;
    let totalChars = 0;
    let pinnedCount = 0;
    let latestTimestamp = 0;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.isPinned) pinnedCount++;
      const text = n.content || '';
      totalChars += text.length;
      if (text.trim()) {
        totalWords += text.trim().split(/\s+/).length;
      }
      if (n.updatedAt) {
        const t = new Date(n.updatedAt).getTime();
        if (!isNaN(t) && t > latestTimestamp) {
          latestTimestamp = t;
        }
      }
    }

    const latestUpdatedTimeAgo = latestTimestamp > 0 ? formatSmartRelativeTime(new Date(latestTimestamp).toISOString()) : 'Just now';

    return { totalWords, totalChars, pinnedCount, latestUpdatedTimeAgo };
  }, [notes]);

  // Selected note stats when 1 note is focused
  const selectedSingleNote = useMemo(() => {
    if (selectedNoteIds.length !== 1) return null;
    const target = notes.find((n) => n.id === selectedNoteIds[0]);
    if (!target) return null;

    const text = target.content || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const updatedTimeAgo = formatSmartRelativeTime(target.updatedAt);

    return {
      title: target.title || 'Untitled Note',
      words,
      updatedTimeAgo,
    };
  }, [notes, selectedNoteIds]);

  // Multi-selection stats
  const multiSelectionStats = useMemo(() => {
    if (selectedNoteIds.length < 2) return null;
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    let combinedWords = 0;
    selectedNotes.forEach((n) => {
      const text = n.content || '';
      if (text.trim()) combinedWords += text.trim().split(/\s+/).length;
    });
    return { count: selectedNotes.length, combinedWords };
  }, [notes, selectedNoteIds]);

  const streakStats = useMemo(() => {
    return calculateJournalStreak(notes);
  }, [notes]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 h-8 border-t backdrop-blur-md px-4 text-[11px] font-sans flex items-center justify-between transition-all select-none ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-300'
          : 'bg-white/95 border-slate-200 text-slate-700'
      }`}
    >
      {/* Left Section: Contextual Insights (Single Note / Multi Note / Workspace) */}
      <div className="flex items-center gap-2.5 min-w-0">
        {selectedSingleNote ? (
          <div className="flex items-center gap-1.5 truncate font-sans text-[11px]">
            <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0 translate-y-[0.5px]" />
            <span className={`font-semibold truncate max-w-[200px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              "{selectedSingleNote.title}"
            </span>
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>·</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              {selectedSingleNote.words} {selectedSingleNote.words === 1 ? 'word' : 'words'}
            </span>
          </div>
        ) : multiSelectionStats ? (
          <div className="flex items-center gap-2 font-sans text-[11px]">
            <span className="font-bold px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-500 border border-blue-500/20 inline-flex items-center gap-1">
              <CheckSquare className="w-3 h-3 shrink-0 translate-y-[0.5px]" />
              <span>{multiSelectionStats.count} notes selected</span>
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              ({multiSelectionStats.combinedWords} words)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-sans text-[11px]">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-400">
              <FileText className="w-3.5 h-3.5 shrink-0 translate-y-[0.5px]" />
              <span>{notes.length} notes</span>
            </span>
            {workspaceStats.pinnedCount > 0 && (
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ({workspaceStats.pinnedCount} pinned)
              </span>
            )}
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>·</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              {workspaceStats.totalWords.toLocaleString()} words total
            </span>
          </div>
        )}
      </div>

      {/* Middle Section: Journal Streak & Engine Status */}
      <div className="hidden md:flex items-center gap-3 font-sans text-[11px]">
        {streakStats.currentStreak > 0 && (
          <div
            className={`px-1.5 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 transition-all ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/50 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="Current Daily Journal Streak"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{streakStats.currentStreak} d streak</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 opacity-75">
          <Database className="w-3.5 h-3.5 text-blue-400 shrink-0 translate-y-[0.5px]" />
          <span>SQLite Local Engine</span>
        </div>
      </div>

      {/* Right Section: Canvas Grid State & Auto-Save */}
      <div className="flex items-center gap-3 font-sans text-[11px]">
        {/* Grid & Snap Indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded-md border capitalize font-semibold inline-flex items-center gap-1 ${
              snapToGrid
                ? isDark
                  ? 'bg-slate-800/80 border-slate-700/50 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
                : 'opacity-60 border-transparent'
            }`}
            title={snapToGrid ? 'Snap to Grid (24px Enabled)' : 'Free-form Placement'}
          >
            <Grid2X2 className="w-3.5 h-3.5 opacity-70 shrink-0 translate-y-[0.5px]" />
            <span>{snapToGrid ? `Snap 24px (${gridType})` : `Grid: ${gridType}`}</span>
          </span>
        </div>

        <div className={`h-3 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Smart Status / Auto-saved / Note Updated indicator */}
        <div className="flex items-center gap-1 font-semibold">
          {selectedSingleNote ? (
            <span className="inline-flex items-center gap-1 text-[11px]" title={`Last modified: ${selectedSingleNote.title}`}>
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 translate-y-[0.5px]" />
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                Updated {selectedSingleNote.updatedTimeAgo}
              </span>
            </span>
          ) : multiSelectionStats ? (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 translate-y-[0.5px]" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Latest update {workspaceStats.latestUpdatedTimeAgo}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px]" title="All workspace notes saved to local SQLite database">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 translate-y-[0.5px]" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                All changes saved
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
