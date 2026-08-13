import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  LayoutGrid,
  Palette,
  HardDrive,
  Sparkles,
  Info,
  Grid2X2,
  Share2,
  PanelBottom,
  Download,
  Upload,
  RefreshCw,
  Keyboard,
  CheckCircle2,
  Sliders,
  Sun,
  Moon,
} from 'lucide-react';
import { CanvasTheme, GridType, Note } from '../../types';
import { CURRENT_VERSION } from '../../utils/updateChecker';

export type SettingsTab = 'canvas' | 'appearance' | 'data' | 'ai' | 'about';

export interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: CanvasTheme;
  onToggleTheme: () => void;
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
  enableAIServices?: boolean;
}

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  isOpen,
  onClose,
  themeMode = 'dark',
  onToggleTheme,
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
  enableAIServices = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('canvas');

  // Handle ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isDark = themeMode !== 'light';
  const pinnedCount = useMemo(() => notes.filter((n) => n.isPinned).length, [notes]);
  const journalCount = useMemo(() => notes.filter((n) => n.isDailyEntry).length, [notes]);
  const lockedCount = useMemo(() => notes.filter((n) => n.isLocked).length, [notes]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl h-[500px] rounded-md shadow-sm border flex flex-col overflow-hidden transition-opacity duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sliders className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <div>
              <h2 className="font-bold text-sm tracking-tight leading-none">Canvas Preferences</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close Preferences (Esc)"
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body: 2-Column Desktop Layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <div
            className={`w-48 border-r p-2.5 flex flex-col justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200/80 bg-slate-50/50'
            }`}
          >
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'canvas'
                    ? isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/80'
                      : 'bg-slate-200/80 text-slate-900 border border-slate-300'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Canvas & Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'appearance'
                    ? isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/80'
                      : 'bg-slate-200/80 text-slate-900 border border-slate-300'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('data')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'data'
                    ? isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/80'
                      : 'bg-slate-200/80 text-slate-900 border border-slate-300'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Data & Backup</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'ai'
                    ? isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/80'
                      : 'bg-slate-200/80 text-slate-900 border border-slate-300'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Features</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'about'
                    ? isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/80'
                      : 'bg-slate-200/80 text-slate-900 border border-slate-300'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About & Info</span>
              </button>
            </nav>

            <div className={`p-2.5 rounded-sm border text-[10px] ${isDark ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
              <div className="flex items-center justify-between font-semibold mb-0.5">
                <span>Version</span>
                <span className="font-mono">{CURRENT_VERSION}</span>
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
                  <h3 className={`font-bold text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Canvas Grid & Alignment
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Control card positioning, snapping increments, and link visuals.
                  </p>
                </div>

                {/* Snap to Grid */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5 text-xs">
                      <Grid2X2 className="w-3.5 h-3.5" />
                      <span>Snap to Grid</span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {snapToGrid
                        ? 'Snaps cards to clean 24px increments when dragging or resizing.'
                        : 'Free-form smooth floating placement anywhere.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleSnapToGrid}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      snapToGrid
                        ? isDark ? 'bg-white' : 'bg-slate-900'
                        : isDark ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        snapToGrid
                          ? isDark ? 'bg-slate-900 translate-x-4' : 'bg-white translate-x-4'
                          : 'bg-white translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Connection Lines Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5 text-xs">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Note Connection Lines</span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Render visual curves between notes referencing @[Note] mentions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleConnections}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showConnections
                        ? isDark ? 'bg-white' : 'bg-slate-900'
                        : isDark ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        showConnections
                          ? isDark ? 'bg-slate-900 translate-x-4' : 'bg-white translate-x-4'
                          : 'bg-white translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Grid Style Selector */}
                <div
                  className={`p-3 rounded-sm border transition-colors ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <label className={`font-semibold block mb-2 text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
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
                            ? isDark
                              ? 'bg-white text-slate-900 border-white'
                              : 'bg-slate-900 text-white border-slate-900'
                            : isDark
                            ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE & THEMES */}
            {activeTab === 'appearance' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Look & Theme
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Customize UI theme mode, dock status, and view keyboard shortcuts.
                  </p>
                </div>

                {/* Theme Mode Selector */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5 text-xs">
                      {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                      <span>Dark Theme</span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Switch between dark slate workspace and light paper mode.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isDark
                        ? 'bg-white'
                        : 'bg-slate-900'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        isDark ? 'bg-slate-900 translate-x-4' : 'bg-white translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Bottom Status Bar Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5 text-xs">
                      <PanelBottom className="w-3.5 h-3.5" />
                      <span>Persistent Status Bar</span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Show live note counters, storage indicators, and word counter at bottom edge.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleStatusBar}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showStatusBar
                        ? isDark ? 'bg-white' : 'bg-slate-900'
                        : isDark ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        showStatusBar
                          ? isDark ? 'bg-slate-900 translate-x-4' : 'bg-white translate-x-4'
                          : 'bg-white translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Keyboard Shortcuts Trigger */}
                {onOpenShortcutsModal && (
                  <div
                    className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                      isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5 text-xs">
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>Keyboard Shortcuts</span>
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Cheatsheet for pan, zoom, cards, history, and search.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenShortcutsModal();
                      }}
                      className={`px-3 py-1.5 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DATA & BACKUP */}
            {activeTab === 'data' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    Storage & Backup
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Export versioned backups or import staged cards with conflict resolution.
                  </p>
                </div>

                {/* Workspace Statistics Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className={`p-2 rounded-sm border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="block text-base font-bold">{notes.length}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Notes</span>
                  </div>
                  <div className={`p-2 rounded-sm border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="block text-base font-bold">{pinnedCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Pinned</span>
                  </div>
                  <div className={`p-2 rounded-sm border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="block text-base font-bold">{journalCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Journals</span>
                  </div>
                  <div className={`p-2 rounded-sm border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="block text-base font-bold">{lockedCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Locked</span>
                  </div>
                </div>

                {/* Export & Import Action Cards */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div
                    className={`p-3 rounded-sm border flex flex-col justify-between gap-2.5 ${
                      isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5 text-xs mb-1">
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Backup</span>
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Save full JSON backup with layout and settings.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onExportBackup}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  <div
                    className={`p-3 rounded-sm border flex flex-col justify-between gap-2.5 ${
                      isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5 text-xs mb-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import Backup</span>
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Load backup with staged preview & conflict resolution.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onTriggerImportFile();
                      }}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AI FEATURES */}
            {activeTab === 'ai' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    AI Intelligence Services
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Configure synthesis models, custom endpoints, and privacy boundaries.
                  </p>
                </div>

                <div
                  className={`p-3.5 rounded-sm border space-y-3 ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="font-semibold text-xs">AI Status</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm border ${
                        enableAIServices
                          ? isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300'
                          : isDark ? 'bg-slate-800/40 text-slate-400 border-slate-700/50' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {enableAIServices ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Multi-card synthesis merges selected notes into consolidated summaries with automated backlink generation.
                  </p>

                  {onOpenAISettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAISettings();
                      }}
                      className={`w-full py-1.5 px-3 rounded-sm border font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Configure AI Settings & Keys</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: ABOUT & INFO */}
            {activeTab === 'about' && (
              <div className="space-y-3.5">
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    About & Updates
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Desktop native infinite canvas journal and workspace.
                  </p>
                </div>

                {/* Auto Update Check Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Check Updates on Launch</span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Query GitHub Releases on startup to notify when newer releases exist.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleCheckForUpdates}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      checkForUpdatesOnLaunch
                        ? isDark ? 'bg-white' : 'bg-slate-900'
                        : isDark ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        checkForUpdatesOnLaunch
                          ? isDark ? 'bg-slate-900 translate-x-4' : 'bg-white translate-x-4'
                          : 'bg-white translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* About Dialog Trigger */}
                {onOpenAbout && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAbout();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-sm border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200/90 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5" />
                      <span className="font-semibold text-xs">Release Notes & System Diagnostics</span>
                    </div>
                    <span className="text-[10px] text-slate-400">&rarr;</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Preferences saved automatically</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-sm font-semibold text-xs transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
