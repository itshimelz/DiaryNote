import React, { useMemo } from 'react';
import { Note, CanvasTheme, GridType } from '../types';
import { calculateJournalStreak } from '../utils';
import {
  Database,
  Grid2X2,
  CheckSquare,
  Clock,
  FileText,
  Flame,
  CheckCircle2,
  Tag,
  Sparkles,
  Loader2,
  Layers,
} from 'lucide-react';

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
  enableAIServices?: boolean;
  isMergingAI?: boolean;
  onToggleSnap?: () => void;
  onCycleGridType?: () => void;
  onOpenBackupModal?: () => void;
  onOpenSearchModal?: (query?: string) => void;
  onOpenJournalCalendar?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  notes = [],
  themeMode = 'dark',
  selectedNoteIds = [],
  snapToGrid = false,
  gridType = 'dots',
  enableAIServices = false,
  isMergingAI = false,
  onToggleSnap,
  onCycleGridType,
  onOpenBackupModal,
  onOpenSearchModal,
  onOpenJournalCalendar,
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

  // Extract unique hashtags (#tag) ONLY when note(s) are selected; show max 3 tags + count remainder
  const tagInfo = useMemo(() => {
    if (selectedNoteIds.length === 0) {
      return { count: 0, displayTags: [], extraCount: 0, firstTag: '' };
    }

    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    const tagSet = new Set<string>();
    const tagRegex = /#([a-zA-Z0-9_\-\u0980-\u09FF]+)/g;

    for (let i = 0; i < selectedNotes.length; i++) {
      const content = selectedNotes[i].content || '';
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(content)) !== null) {
        if (match[1]) tagSet.add(match[1]);
      }
    }

    const uniqueTags = Array.from(tagSet);
    const displayTags = uniqueTags.slice(0, 3).map((t) => `#${t}`);
    const extraCount = Math.max(0, uniqueTags.length - 3);

    return {
      count: uniqueTags.length,
      displayTags,
      extraCount,
      firstTag: uniqueTags.length > 0 ? `#${uniqueTags[0]}` : '',
    };
  }, [notes, selectedNoteIds]);

  const flatItemHoverClass = `transition-colors cursor-pointer opacity-80 hover:opacity-100 ${
    isDark ? 'text-slate-300 hover:text-blue-400' : 'text-slate-700 hover:text-blue-600'
  }`;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 h-8 border-t backdrop-blur-md px-4 text-[11px] font-sans flex items-center justify-between transition-colors select-none ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-300'
          : 'bg-white/95 border-slate-200 text-slate-700'
      }`}
    >
      {/* Left Section: Contextual Insights & Tag Summary (Flat Styling) */}
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
            <span className="font-bold inline-flex items-center gap-1 text-blue-400">
              <CheckSquare className="w-3.5 h-3.5 shrink-0 translate-y-[0.5px]" />
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

        {/* Task 13: Tag & Category Summary (Only visible when note(s) selected; max 3 tags + extra count) */}
        {tagInfo.count > 0 && (
          <>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
            <button
              type="button"
              onClick={() => onOpenSearchModal?.(tagInfo.firstTag)}
              className={`inline-flex items-center gap-1 font-medium ${flatItemHoverClass}`}
              title={`Selected tags: ${tagInfo.displayTags.join(' ')}${
                tagInfo.extraCount > 0 ? ` +${tagInfo.extraCount} more` : ''
              }. Click to search.`}
            >
              <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                {tagInfo.displayTags.join(' ')}
                {tagInfo.extraCount > 0 && (
                  <span className="ml-0.5 opacity-70 font-semibold">+{tagInfo.extraCount}</span>
                )}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Middle Section: Journal Streak, AI Engine Status, & Database Engine (Flat Styling) */}
      <div className="hidden md:flex items-center gap-3.5 font-sans text-[11px]">
        {/* Journal Streak Button */}
        {streakStats.currentStreak > 0 && (
          <button
            type="button"
            onClick={onOpenJournalCalendar}
            className={`inline-flex items-center gap-1 font-semibold ${flatItemHoverClass}`}
            title="Click to view Journal Calendar"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{streakStats.currentStreak} d streak</span>
          </button>
        )}

        {/* Task 14: Dynamic AI Engine Status Indicator */}
        <div
          className={`inline-flex items-center gap-1 font-semibold transition-colors ${
            isMergingAI
              ? 'text-blue-400'
              : enableAIServices
              ? isDark ? 'text-slate-300' : 'text-slate-700'
              : 'opacity-50'
          }`}
          title={isMergingAI ? 'AI merging operation in progress' : enableAIServices ? 'AI Engine Service Ready' : 'AI Services Disabled'}
        >
          {isMergingAI ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
          ) : (
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${enableAIServices ? 'text-amber-400' : 'opacity-40'}`} />
          )}
          <span>{isMergingAI ? 'AI Merging...' : enableAIServices ? 'AI Ready' : 'AI Off'}</span>
        </div>

        {/* Task 16: Clickable Database Engine & Quick Storage Trigger */}
        <button
          type="button"
          onClick={onOpenBackupModal}
          className={`inline-flex items-center gap-1 font-semibold ${flatItemHoverClass}`}
          title="SQLite Local Storage Engine. Click to export full database backup."
        >
          <Database className="w-3.5 h-3.5 text-blue-400 shrink-0 translate-y-[0.5px]" />
          <span>SQLite Engine</span>
        </button>
      </div>

      {/* Right Section: Interactive Grid & Snap Controls + Auto-Save Status (Flat Styling) */}
      <div className="flex items-center gap-3 font-sans text-[11px]">
        {/* Task 15: Interactive Clickable Grid Type Switcher */}
        <button
          type="button"
          onClick={onCycleGridType}
          className={`capitalize font-semibold inline-flex items-center gap-1 ${flatItemHoverClass}`}
          title={`Grid background: ${gridType}. Click to cycle type.`}
        >
          <Grid2X2 className="w-3.5 h-3.5 opacity-70 shrink-0 translate-y-[0.5px]" />
          <span>Grid: {gridType}</span>
        </button>

        {/* Task 15: Interactive Clickable Grid Snap Switcher */}
        <button
          type="button"
          onClick={onToggleSnap}
          className={`capitalize font-semibold inline-flex items-center gap-1 ${flatItemHoverClass} ${
            snapToGrid ? 'text-blue-400 font-bold opacity-100' : 'opacity-60'
          }`}
          title={snapToGrid ? 'Snap to Grid (24px Enabled). Click to toggle.' : 'Free-form Placement. Click to enable 24px Snap.'}
        >
          <Layers className="w-3.5 h-3.5 shrink-0 translate-y-[0.5px]" />
          <span>{snapToGrid ? 'Snap 24px' : 'Freeform'}</span>
        </button>

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
