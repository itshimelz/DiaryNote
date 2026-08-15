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
} from '@hugeicons/core-free-icons';
import { CanvasTheme, GridType, Note } from '../../types';
import { CURRENT_VERSION } from '../../utils/updateChecker';
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

export type SettingsTab = 'canvas' | 'appearance' | 'data' | 'ai' | 'about';

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
  enableAIServices?: boolean;
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
  enableAIServices = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('canvas');

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
                      <span className="text-sm">📌</span>
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
                    Backup Actions
                  </span>
                  <div className="flex gap-2">
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
