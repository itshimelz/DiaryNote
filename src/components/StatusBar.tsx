import React, { useMemo } from 'react';
import { Note, CanvasTheme, GridType } from '../types';
import { calculateJournalStreak } from '../utils';
import {
  Database01Icon,
  CheckmarkSquare02Icon,
  File01Icon,
  FireIcon,
  CheckmarkCircle02Icon,
  Tag01Icon,
  SparklesIcon,
  Loading03Icon,
  Layers01Icon,
  Alert02Icon,
  Grid02Icon,
  ClipboardIcon,
} from '@hugeicons/core-free-icons';
import { Icon, Badge } from './ui';

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
  cutNoteIds?: string[];
  snapToGrid?: boolean;
  gridType?: GridType;
  enableAIServices?: boolean;
  isMergingAI?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
  lastSavedAt?: Date | null;
  onCancelCut?: () => void;
  onToggleSnap?: () => void;
  onCycleGridType?: () => void;
  onOpenBackupModal?: () => void;
  onOpenSearchModal?: (query?: string) => void;
  onOpenJournalCalendar?: () => void;
}

const StatusBarComponent: React.FC<StatusBarProps> = ({
  notes = [],
  themeMode = 'dark',
  selectedNoteIds = [],
  cutNoteIds = [],
  snapToGrid = false,
  gridType = 'dots',
  enableAIServices = false,
  isMergingAI = false,
  isSaving = false,
  saveError = null,
  lastSavedAt: _lastSavedAt = null,
  onCancelCut,
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

    const latestUpdatedTimeAgo =
      latestTimestamp > 0
        ? formatSmartRelativeTime(new Date(latestTimestamp).toISOString())
        : 'Just now';

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

    selectedNotes.forEach((n) => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach((t) => {
          if (t && t.trim()) tagSet.add(`#${t.replace(/^#/, '').trim()}`);
        });
      }
      if (n.content) {
        const matches = n.content.match(/#[a-zA-Z0-9_\u0980-\u09FF-]+/g);
        if (matches) {
          matches.forEach((m) => tagSet.add(m));
        }
      }
    });

    const tagsArr = Array.from(tagSet);
    const count = tagsArr.length;
    const displayTags = tagsArr.slice(0, 3);
    const extraCount = Math.max(0, count - 3);
    const firstTag = tagsArr.length > 0 ? tagsArr[0].replace(/^#/, '') : '';

    return { count, displayTags, extraCount, firstTag };
  }, [notes, selectedNoteIds]);

  // Harmonized icon and button hover styling
  const defaultIconClass = 'text-slate-400 dark:text-slate-500';
  const btnHoverClass =
    'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800';

  return (
    <footer
      role="contentinfo"
      aria-label="Workspace status and statistics bar"
      className={`fixed bottom-0 inset-x-0 h-7 border-t z-30 px-3 flex items-center justify-between font-sans text-xs select-none transition-colors backdrop-blur-md ${
        isDark
          ? 'bg-slate-950/90 border-slate-850 text-slate-400'
          : 'bg-white/90 border-slate-200 text-slate-600'
      }`}
    >
      {/* Left Section: Note & Selection Statistics */}
      <div className="flex items-center gap-2.5 min-w-0">
        {selectedSingleNote ? (
          <div className="flex items-center gap-1.5 truncate font-sans text-[11px]">
            <Icon icon={File01Icon} size="xs" className={defaultIconClass} />
            <span
              className={`font-semibold truncate max-w-[200px] ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              "{selectedSingleNote.title}"
            </span>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              {selectedSingleNote.words} {selectedSingleNote.words === 1 ? 'word' : 'words'}
            </span>
          </div>
        ) : multiSelectionStats ? (
          <div className="flex items-center gap-2 font-sans text-[11px]">
            <span
              className={`font-semibold inline-flex items-center gap-1.5 ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              <Icon icon={CheckmarkSquare02Icon} size="xs" className={defaultIconClass} />
              <span>{multiSelectionStats.count} notes selected</span>
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              ({multiSelectionStats.combinedWords} words)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-sans text-[11px]">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              <Icon icon={File01Icon} size="xs" className={defaultIconClass} />
              <span>{notes.length} notes</span>
            </span>
            {workspaceStats.pinnedCount > 0 && (
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ({workspaceStats.pinnedCount} pinned)
              </span>
            )}
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              {workspaceStats.totalWords.toLocaleString()} words total
            </span>
          </div>
        )}

        {/* Tag & Category Summary */}
        {tagInfo.count > 0 && (
          <>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
            <button
              type="button"
              onClick={() => onOpenSearchModal?.(tagInfo.firstTag)}
              className={btnHoverClass}
              title={`Selected tags: ${tagInfo.displayTags.join(' ')}${
                tagInfo.extraCount > 0 ? ` +${tagInfo.extraCount} more` : ''
              }. Click to search.`}
            >
              <Icon icon={Tag01Icon} size="xs" className={defaultIconClass} />
              <span>
                {tagInfo.displayTags.join(' ')}
                {tagInfo.extraCount > 0 && (
                  <span className="ml-0.5 opacity-70 font-semibold">+{tagInfo.extraCount}</span>
                )}
              </span>
            </button>
          </>
        )}

        {/* Live Active Cut & Relocate Status Indicator */}
        {cutNoteIds && cutNoteIds.length > 0 && (
          <>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-sans text-[11px]">
              <Icon icon={ClipboardIcon} size="xs" className={defaultIconClass} />
              <span>
                {cutNoteIds.length === 1 ? '1 note cut' : `${cutNoteIds.length} notes cut`} (Press Ctrl+V to place)
              </span>
              {onCancelCut && (
                <button
                  type="button"
                  onClick={onCancelCut}
                  className="inline-flex items-center px-1 py-0.5 rounded-xs text-[10px] uppercase font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cancel Cut (Esc)"
                >
                  Esc
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Middle Section: Dead-Center Positioned Journal Streak, AI Engine Status, & Database Engine */}
      <div className="hidden md:flex items-center gap-3 font-sans text-[11px] absolute left-1/2 -translate-x-1/2 pointer-events-auto">
        {/* Journal Streak Button */}
        {streakStats.currentStreak > 0 && (
          <button
            type="button"
            onClick={onOpenJournalCalendar}
            className={btnHoverClass}
            title="Click to view Journal Calendar"
          >
            <Icon icon={FireIcon} size="xs" className={`${defaultIconClass} shrink-0`} />
            <span className="font-semibold">
              {streakStats.currentStreak}d streak
            </span>
          </button>
        )}

        {/* Dynamic AI Engine Status Indicator */}
        <div
          className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-xs transition-colors font-medium ${
            enableAIServices || isMergingAI
              ? 'text-slate-600 dark:text-slate-400'
              : 'text-slate-400 dark:text-slate-600 opacity-70'
          }`}
          title={
            isMergingAI
              ? 'AI merging operation in progress'
              : enableAIServices
              ? 'AI Engine Service Ready'
              : 'AI Services Disabled'
          }
        >
          {isMergingAI ? (
            <Icon
              icon={Loading03Icon}
              size="xs"
              className={`animate-spin ${defaultIconClass}`}
            />
          ) : (
            <Icon
              icon={SparklesIcon}
              size="xs"
              className={defaultIconClass}
            />
          )}
          <span>{isMergingAI ? 'AI Merging...' : enableAIServices ? 'AI Ready' : 'AI Off'}</span>
        </div>

        {/* Clickable Database Engine & Quick Storage Trigger */}
        <button
          type="button"
          onClick={onOpenBackupModal}
          className={btnHoverClass}
          title="IndexedDB Local Storage Engine. Click to export full database backup."
        >
          <Icon icon={Database01Icon} size="xs" className={defaultIconClass} />
          <span>IndexedDB Engine</span>
        </button>
      </div>

      {/* Right Section: Interactive Grid & Snap Controls + Jitter-Free Auto-Save Status */}
      <div className="flex items-center gap-2.5 font-sans text-[11px]">
        {/* Interactive Clickable Grid Type Switcher */}
        <button
          type="button"
          onClick={onCycleGridType}
          className={btnHoverClass}
          title={`Grid background: ${gridType}. Click to cycle type.`}
        >
          <Icon icon={Grid02Icon} size="xs" className={defaultIconClass} />
          <span>Grid: {gridType}</span>
        </button>

        {/* Interactive Clickable Grid Snap Switcher */}
        <button
          type="button"
          onClick={onToggleSnap}
          className={
            snapToGrid
              ? 'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/10'
              : btnHoverClass
          }
          title={
            snapToGrid
              ? 'Snap to Grid (24px Enabled). Click to toggle.'
              : 'Snap to Grid (Disabled). Click to enable.'
          }
        >
          <Icon icon={Layers01Icon} size="xs" className={defaultIconClass} />
          <span>Snap: {snapToGrid ? '24px' : 'Off'}</span>
        </button>

        <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>

        {/* Reserved Width Jitter-Free Save State Indicator */}
        <div
          className="flex items-center justify-end w-36 min-w-[144px] shrink-0"
          title={
            saveError
              ? `Save error: ${saveError}`
              : isSaving
              ? 'Saving changes to IndexedDB store...'
              : `All notes up to date (${workspaceStats.latestUpdatedTimeAgo})`
          }
        >
          {saveError ? (
            <Badge variant="danger" size="xs" icon={Alert02Icon}>
              Save Error
            </Badge>
          ) : isSaving ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-500 dark:text-slate-400">
              <Icon icon={Loading03Icon} size="xs" className="animate-spin shrink-0" />
              <span>Saving...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Icon icon={CheckmarkCircle02Icon} size="xs" className="shrink-0" />
              <span>Saved · {workspaceStats.latestUpdatedTimeAgo}</span>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
};

export const StatusBar = React.memo(StatusBarComponent);
