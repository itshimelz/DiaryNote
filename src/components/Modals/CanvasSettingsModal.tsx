import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontalIcon,
  LayoutGridIcon,
  PaintBoardIcon,
  Database01Icon,
  SparklesIcon,
  InformationCircleIcon,
  Sun01Icon,
  Moon01Icon,
  Upload04Icon,
  Download04Icon,
  KeyboardIcon,
  PinIcon,
  SecurityLockIcon,
  Key01Icon,
  CircleQuestionMarkIcon,
  Delete02Icon,
  Book01Icon,
  Tick02Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { CanvasTheme, GridType, Note, CoverStyle, SealStyle } from '../../types';
import { CURRENT_VERSION } from '../../utils/updateChecker';
import {
  NOTE_COVER_STYLES,
  SEAL_STYLES,
  getCoverStyleById,
  getSealStyleById,
} from '../../constants/noteCovers';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Badge,
  Switch,
  Icon,
} from '../ui';
import { SecurityModalMode } from './SecurityModal';

export type SettingsTab = 'canvas' | 'appearance' | 'covers' | 'data' | 'security' | 'ai' | 'about';

export interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: CanvasTheme;
  onToggleTheme: () => void;
  onChangeThemeMode?: (mode: CanvasTheme) => void;
  gridType: GridType;
  onChangeGridType: (type: GridType) => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  showConnections: boolean;
  onToggleConnections: () => void;
  showStatusBar: boolean;
  onToggleStatusBar: () => void;
  checkForUpdatesOnLaunch: boolean;
  onToggleCheckForUpdates: () => void;
  notes: Note[];
  zoom: number;
  onExportBackup: () => void;
  onTriggerImportFile: () => void;
  onOpenAbout?: () => void;
  onOpenAISettings?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenDatabaseOperations?: () => void;
  enableAIServices?: boolean;
  masterPasswordHash?: string;
  masterSecurityQuestion?: string;
  isMasterUnlocked?: boolean;
  onLockSession?: () => void;
  onUnlockSession?: () => void;
  onOpenSecurityModal?: (mode: SecurityModalMode) => void;
}

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  isOpen,
  onClose,
  themeMode = 'dark',
  onToggleTheme,
  onChangeThemeMode,
  gridType,
  onChangeGridType,
  snapToGrid,
  onToggleSnapToGrid,
  showConnections,
  onToggleConnections,
  showStatusBar,
  onToggleStatusBar,
  checkForUpdatesOnLaunch,
  onToggleCheckForUpdates,
  notes,
  zoom: _zoom,
  onExportBackup,
  onTriggerImportFile,
  onOpenAbout,
  onOpenAISettings,
  onOpenShortcutsModal,
  onOpenDatabaseOperations,
  enableAIServices = false,
  masterPasswordHash,
  masterSecurityQuestion,
  isMasterUnlocked = false,
  onLockSession,
  onUnlockSession,
  onOpenSecurityModal,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('canvas');
  const [previewCoverStyle, setPreviewCoverStyle] = useState<CoverStyle>('classic-kraft');
  const [previewSealStyle, setPreviewSealStyle] = useState<SealStyle>('wax-seal-crest');
  const [previewRevealed, setPreviewRevealed] = useState<boolean>(false);

  const pinnedCount = useMemo(() => notes.filter((n) => n.isPinned).length, [notes]);
  const journalCount = useMemo(() => notes.filter((n) => n.isDailyEntry).length, [notes]);
  const lockedCount = useMemo(() => notes.filter((n) => n.isLocked).length, [notes]);

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-3xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={SlidersHorizontalIcon} size="md" />
            <span>Canvas Preferences</span>
          </span>
        }
        onClose={onClose}
      />

      <DialogBody className="p-0">
        {/* Main Body: 2-Column Desktop Layout */}
        <div className="flex h-[450px] min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <div className="w-52 border-r border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'canvas'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={LayoutGridIcon} size="xs" />
                <span>Canvas & Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={PaintBoardIcon} size="xs" />
                <span>Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('covers')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'covers'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={Book01Icon} size="xs" />
                <span>Covers & Seals</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('data')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'data'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={Database01Icon} size="xs" />
                <span>Data & Backup</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={SecurityLockIcon} size="xs" />
                <span>Security & Lock</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={SparklesIcon} size="xs" />
                <span>AI Features</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'about'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon icon={InformationCircleIcon} size="xs" />
                <span>About & Info</span>
              </button>
            </nav>

            <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between font-semibold mb-0.5">
                <span>Version</span>
                <span className="font-mono">v{CURRENT_VERSION}</span>
              </div>
              <span>Desktop Edition</span>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3.5 text-xs">
            {/* TAB 1: CANVAS & GRID */}
            {activeTab === 'canvas' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    Canvas Grid & Alignment
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Control card positioning, snapping increments, and link visuals.
                  </p>
                </div>

                {/* Snap to Grid */}
                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <Switch
                    label="Snap to Grid"
                    description={
                      snapToGrid
                        ? 'Snaps cards to clean 24px increments when dragging or resizing.'
                        : 'Free-form smooth floating placement anywhere.'
                    }
                    checked={snapToGrid}
                    onChange={onToggleSnapToGrid}
                  />
                </div>

                {/* Connection Lines Toggle */}
                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <Switch
                    label="Note Connection Lines"
                    description="Render visual curves between notes referencing @[Note] mentions."
                    checked={showConnections}
                    onChange={onToggleConnections}
                  />
                </div>

                {/* Grid Style Selector */}
                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <label className="font-semibold block mb-2 text-xs text-slate-800 dark:text-slate-200">
                    Canvas Background Pattern
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['dots', 'grid', 'ruled', 'blank'] as GridType[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => onChangeGridType(g)}
                        className={`py-1.5 px-3 rounded-sm capitalize font-semibold text-xs border transition-colors cursor-pointer text-center ${
                          gridType === g
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    Theme & Interface
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Switch workspace color scheme and desktop chrome indicators.
                  </p>
                </div>

                {/* Theme Mode Selector */}
                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    Workspace Canvas Theme
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onChangeThemeMode) onChangeThemeMode('dark');
                        else if (themeMode === 'light') onToggleTheme();
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-slate-900 text-white border-blue-500 ring-1 ring-blue-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <Icon icon={Moon01Icon} size="xs" />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onChangeThemeMode) onChangeThemeMode('light');
                        else if (themeMode === 'dark') onToggleTheme();
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'light'
                          ? 'bg-slate-900 text-white border-blue-500 ring-1 ring-blue-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <Icon icon={Sun01Icon} size="xs" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onChangeThemeMode) onChangeThemeMode('cork');
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'cork'
                          ? 'bg-[#b78a58] text-white border-amber-500 ring-1 ring-amber-500 shadow-xs font-bold'
                          : 'bg-[#faf6ee] dark:bg-slate-800/80 border-amber-200 dark:border-slate-700 text-amber-900 dark:text-amber-200 hover:border-amber-400'
                      }`}
                    >
                      <Icon icon={PinIcon} size="xs" />
                      <span>Cork Board</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onChangeThemeMode) onChangeThemeMode('gradient');
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'gradient'
                          ? 'bg-blue-600 text-white border-blue-500 ring-1 ring-blue-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <Icon icon={PaintBoardIcon} size="xs" />
                      <span>Gradient</span>
                    </button>
                  </div>
                </div>

                {/* Status Bar Toggle */}
                {onToggleStatusBar && (
                  <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <Switch
                      label="Canvas Status Bar"
                      description="Show persistence status, card counts, and coordinates at the bottom."
                      checked={showStatusBar}
                      onChange={onToggleStatusBar}
                    />
                  </div>
                )}

                {/* Update Check on Launch */}
                {onToggleCheckForUpdates && (
                  <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <Switch
                      label="Check for Updates on Launch"
                      description="Periodically check GitHub releases in the background (0 notes or data transmitted)."
                      checked={checkForUpdatesOnLaunch}
                      onChange={onToggleCheckForUpdates}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB: COVERS & SEALS */}
            {activeTab === 'covers' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    Note Covers & Vector Seals
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Conceal personal notes with decorative covers and artistic vector seal emblems until tapped.
                  </p>
                </div>

                {/* Interactive Live Preview Box */}
                <div className="p-3.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Interactive Live Preview
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {previewRevealed ? 'Revealed' : 'Covered (Click card to toggle)'}
                    </span>
                  </div>

                  {/* Card Simulation */}
                  <div className="flex items-center justify-center py-2">
                    <div
                      onClick={() => setPreviewRevealed(!previewRevealed)}
                      className={`w-72 h-44 rounded-sm p-4 flex flex-col justify-between select-none cursor-pointer transition-all duration-200 shadow-sm relative overflow-hidden ${
                        previewRevealed
                          ? 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                          : `${getCoverStyleById(previewCoverStyle).cardClass} ${getCoverStyleById(previewCoverStyle).borderClass}`
                      }`}
                    >
                      {previewRevealed ? (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                            <span className="font-bold text-xs">Sample Private Entry</span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                              Close Cover
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed my-auto">
                            This is how your note content appears when unveiled. Tapping "Close Cover" or re-sealing it will hide the text behind your chosen cover style and seal SVG.
                          </p>
                          <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span>Markdown & tasks supported</span>
                            <span className="flex items-center gap-1">
                              <Icon icon={Tick02Icon} size="xs" />
                              <span>Unveiled</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[10px] opacity-70">
                            <span className="font-mono uppercase">2026-08-20</span>
                            <span className="flex items-center gap-1">
                              <Icon icon={Book01Icon} size="xs" />
                              <span>Cover</span>
                            </span>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center gap-2 my-auto">
                            <div className="transform transition-transform hover:scale-105">
                              {getSealStyleById(previewSealStyle).renderIcon({
                                size: 42,
                                color: getCoverStyleById(previewCoverStyle).accentColor,
                              })}
                            </div>
                            <h4 className={`font-bold text-sm line-clamp-1 ${getCoverStyleById(previewCoverStyle).titleClass}`}>
                              Sample Private Entry
                            </h4>
                          </div>
                          <div className="flex items-center justify-center text-[10px] font-medium opacity-80">
                            <span className="flex items-center gap-1">
                              <span>Click anywhere to open</span>
                              <Icon icon={ArrowRight01Icon} size="xs" />
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Styles Swatches */}
                <div className="space-y-2">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    Available Cover Styles ({NOTE_COVER_STYLES.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {NOTE_COVER_STYLES.map((cov) => {
                      const isSelected = previewCoverStyle === cov.id;
                      return (
                        <button
                          key={cov.id}
                          type="button"
                          onClick={() => {
                            setPreviewCoverStyle(cov.id);
                            setPreviewRevealed(false);
                          }}
                          className={`p-2 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-8 rounded-xs flex items-center justify-center text-[10px] font-bold ${cov.previewBg}`}>
                            {cov.name}
                          </div>
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate">
                            {cov.name}
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {cov.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vector Seal Emblems Gallery */}
                <div className="space-y-2">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    Vector Seal Emblems ({SEAL_STYLES.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SEAL_STYLES.map((seal) => {
                      const isSelected = previewSealStyle === seal.id;
                      return (
                        <button
                          key={seal.id}
                          type="button"
                          onClick={() => {
                            setPreviewSealStyle(seal.id);
                            setPreviewRevealed(false);
                          }}
                          className={`p-2.5 rounded-sm border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                          }`}
                        >
                          <div className="text-slate-800 dark:text-slate-200">
                            {seal.renderIcon({ size: 32 })}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-full">
                            {seal.name}
                          </span>
                          <span className="text-[8px] text-slate-500 dark:text-slate-400">
                            {seal.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DATA & BACKUP */}
            {activeTab === 'data' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    Backup & Workspace Storage
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Export JSON snapshots or restore previous backups with duplicate detection.
                  </p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                      {notes.length}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Total Notes</span>
                  </div>
                  <div className="p-2 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                      {pinnedCount}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Pinned</span>
                  </div>
                  <div className="p-2 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                      {journalCount}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Journal</span>
                  </div>
                  <div className="p-2 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                      {lockedCount}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Locked</span>
                  </div>
                </div>

                {/* Backup Actions */}
                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    Backup & Storage Actions
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {onOpenDatabaseOperations && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Database01Icon}
                        onClick={() => {
                          onClose();
                          setTimeout(() => onOpenDatabaseOperations(), 50);
                        }}
                      >
                        Manage Database & Storage
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Download04Icon}
                      onClick={onExportBackup}
                    >
                      Export Backup JSON
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Upload04Icon}
                      onClick={() => {
                        onClose();
                        setTimeout(() => onTriggerImportFile(), 50);
                      }}
                    >
                      Import Backup JSON
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SECURITY & LOCK */}
            {activeTab === 'security' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    Vault & Security Settings
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Manage master passcode protection, session locks, and account recovery.
                  </p>
                </div>

                {/* Status Card */}
                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon={SecurityLockIcon} size="sm" className="text-slate-600 dark:text-slate-400" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Master Passcode</span>
                    </div>
                    {masterPasswordHash ? (
                      <Badge variant="success" size="xs">
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="xs">
                        Not Set
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {masterPasswordHash
                      ? 'Your vault is secured with local cryptographic hashing. Locked notes require your passcode or recovery answer to access.'
                      : 'Protect sensitive notes with client-side zero-knowledge encryption.'}
                  </p>

                  {masterPasswordHash ? (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Session Status:</span>
                        <Badge variant={isMasterUnlocked ? 'success' : 'subtle'} size="xs">
                          {isMasterUnlocked ? 'Unlocked' : 'Locked'}
                        </Badge>
                      </div>
                      {isMasterUnlocked ? (
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={SecurityLockIcon}
                          onClick={() => onLockSession?.()}
                        >
                          Lock Session Now
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="xs"
                          icon={Key01Icon}
                          onClick={() => onUnlockSession?.()}
                        >
                          Unlock Session
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                      <Button
                        variant="primary"
                        size="xs"
                        icon={SecurityLockIcon}
                        onClick={() => {
                          onClose();
                          onOpenSecurityModal?.('set');
                        }}
                      >
                        Set Master Passcode
                      </Button>
                    </div>
                  )}
                </div>

                {/* Passcode Actions (When Configured) */}
                {masterPasswordHash && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Passcode & Recovery Actions
                    </h4>

                    {/* Change Passcode */}
                    <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Icon icon={Key01Icon} size="xs" />
                          <span>Change Passcode</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Update your master password by verifying current passcode.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          onClose();
                          onOpenSecurityModal?.('change');
                        }}
                      >
                        Change
                      </Button>
                    </div>

                    {/* Reset via Recovery */}
                    <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Icon icon={CircleQuestionMarkIcon} size="xs" />
                          <span>Reset Passcode</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Forgot your passcode? Reset using your security recovery question.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          onClose();
                          onOpenSecurityModal?.('reset');
                        }}
                      >
                        Reset
                      </Button>
                    </div>

                    {/* Update Recovery Question */}
                    <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Icon icon={CircleQuestionMarkIcon} size="xs" />
                          <span>Update Recovery Question</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          "{masterSecurityQuestion || 'Secret Question'}"
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          onClose();
                          onOpenSecurityModal?.('update_recovery');
                        }}
                      >
                        Update
                      </Button>
                    </div>

                    {/* Remove Passcode */}
                    <div className="p-3 rounded-sm border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <Icon icon={Delete02Icon} size="xs" />
                          <span>Remove Passcode</span>
                        </div>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 truncate">
                          Disable passcode protection and unlock all notes.
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => {
                          onClose();
                          onOpenSecurityModal?.('remove');
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AI FEATURES */}
            {activeTab === 'ai' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    AI Assistant Configuration
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Configure local Gemini, OpenAI, Claude, or Ollama endpoints.
                  </p>
                </div>

                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        AI Workspace Tools
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {enableAIServices
                          ? 'AI note synthesis and smart merge are active.'
                          : 'AI tools are currently disabled.'}
                      </p>
                    </div>

                    <Badge variant={enableAIServices ? 'success' : 'default'} size="sm">
                      {enableAIServices ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  {onOpenAISettings && (
                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={SparklesIcon}
                        onClick={() => {
                          onClose();
                          onOpenAISettings();
                        }}
                      >
                        Configure AI Providers & API Keys
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: ABOUT & INFO */}
            {activeTab === 'about' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-slate-900 dark:text-slate-200">
                    About DiaryNote
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Desktop Canvas Workspace & Graph Journal.
                  </p>
                </div>

                <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Version</span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      v{CURRENT_VERSION}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Architecture</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Tauri 2 + React 19 + TypeScript
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Privacy</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      100% Local-First & Encrypted At Rest
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {onOpenShortcutsModal && (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={KeyboardIcon}
                      onClick={() => {
                        onClose();
                        onOpenShortcutsModal();
                      }}
                    >
                      Keyboard Shortcuts
                    </Button>
                  )}
                  {onOpenAbout && (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={InformationCircleIcon}
                      onClick={() => {
                        onClose();
                        onOpenAbout();
                      }}
                    >
                      Check for Updates
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="primary" size="sm" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
