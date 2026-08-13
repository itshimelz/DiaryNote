import React, { useState, useRef } from 'react';
import { GridType, CanvasTheme, Note } from '../types';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Sun,
  Moon,
  List,
  Move,
  MousePointer,
  Undo2,
  Redo2,
  Settings,
  Calendar,
} from 'lucide-react';
import { CanvasSettingsModal } from './Modals/CanvasSettingsModal';

interface CanvasControlsProps {
  notes?: Note[];
  zoom: number;
  gridType: GridType;
  themeMode: CanvasTheme;
  snapToGrid: boolean;
  showConnections: boolean;
  hasBatchBar?: boolean;
  enableAIServices?: boolean;
  onOpenAISettings?: () => void;
  onAddNote: () => void;
  onOpenTodayJournal?: () => void;
  onOpenJournalCalendar?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitNotes: () => void;
  onChangeGridType: (grid: GridType) => void;
  onToggleTheme: () => void;
  onToggleSnapToGrid: () => void;
  onToggleConnections: () => void;
  onOpenNotesList: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSearch?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenAbout?: () => void;
  showStatusBar?: boolean;
  onToggleStatusBar?: () => void;
  checkForUpdatesOnLaunch?: boolean;
  onToggleCheckForUpdates?: () => void;
}

const CanvasControlsComponent: React.FC<CanvasControlsProps> = ({
  notes = [],
  zoom,
  gridType,
  themeMode,
  snapToGrid,
  showConnections,
  hasBatchBar: _hasBatchBar,
  onAddNote,
  onOpenTodayJournal,
  onOpenJournalCalendar,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitNotes,
  onChangeGridType,
  onToggleTheme,
  onToggleSnapToGrid,
  onToggleConnections,
  onOpenNotesList,
  onExportBackup,
  onImportBackup,
  isPanMode,
  onTogglePanMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSearch: _onOpenSearch,
  onOpenShortcutsModal,
  onOpenAbout,
  showStatusBar = true,
  onToggleStatusBar,
  checkForUpdatesOnLaunch = true,
  onToggleCheckForUpdates,
  enableAIServices = false,
  onOpenAISettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSettingsOpen(false);
      onImportBackup(file);
      e.target.value = '';
    }
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Primary Control Bar Row inside Unified Dock */}
      <div className="w-full flex items-center justify-between gap-1.5 p-1.5 text-xs transition-colors">
        <div className="flex items-center gap-1.5">
          {/* Create Note CTA */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onAddNote();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold tracking-wider uppercase text-[11px] rounded-md shadow transition-colors cursor-pointer ${
              themeMode === 'light'
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>

          {/* Today's Journal CTA */}
          {onOpenTodayJournal && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTodayJournal();
              }}
              title="Today's Journal Entry (Ctrl+Shift+D)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                themeMode === 'light'
                  ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Today</span>
            </button>
          )}

          {/* Journal Calendar CTA */}
          {onOpenJournalCalendar && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenJournalCalendar();
              }}
              title="Open Journal Calendar"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                themeMode === 'light'
                  ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Undo & Redo Controls */}
        <div
          className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
            themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
          }`}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onUndo();
            }}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? themeMode === 'light'
                  ? 'hover:bg-slate-200/80 text-slate-700 cursor-pointer'
                  : 'hover:bg-slate-700 text-slate-200 cursor-pointer'
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onRedo();
            }}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? themeMode === 'light'
                  ? 'hover:bg-slate-200/80 text-slate-700 cursor-pointer'
                  : 'hover:bg-slate-700 text-slate-200 cursor-pointer'
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Pan vs Select Mode */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.currentTarget.blur();
            onTogglePanMode();
          }}
          title={isPanMode ? 'Pan Mode (Active) - Click to switch to Select' : 'Select Mode - Click to switch to Pan'}
          aria-label={isPanMode ? 'Switch to select mode' : 'Switch to pan mode'}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isPanMode
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow'
              : themeMode === 'light'
              ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
          }`}
        >
          {isPanMode ? <Move className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
        </button>

        {/* Zoom Controls */}
        <div
          className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
            themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
          }`}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onZoomOut();
            }}
            title="Zoom Out (Ctrl -)"
            aria-label="Zoom out"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              themeMode === 'light' ? 'hover:bg-slate-200/80 text-slate-600' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onResetZoom();
            }}
            title="Click to reset zoom to 100%"
            aria-label="Reset zoom to 100 percent"
            className={`px-2 font-mono text-[11px] font-medium cursor-pointer ${
              themeMode === 'light' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
            }`}
          >
            {zoomPercent}%
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onZoomIn();
            }}
            title="Zoom In (Ctrl +)"
            aria-label="Zoom in"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              themeMode === 'light' ? 'hover:bg-slate-200/80 text-slate-600' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onFitNotes();
            }}
            title="Fit All Notes on Canvas"
            aria-label="Fit all notes on canvas"
            className={`p-1.5 rounded-md transition-colors border-l ml-0.5 cursor-pointer ${
              themeMode === 'light'
                ? 'border-slate-200 hover:bg-slate-200/80 text-slate-600'
                : 'border-slate-700/50 hover:bg-slate-700 text-slate-400'
            }`}
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Monochromatic Canvas Theme Toggle */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleTheme();
          }}
          title={`Switch to ${themeMode === 'dark' ? 'Monochrome Light' : 'Monochrome Dark'} Canvas`}
          aria-label="Change canvas theme"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            themeMode === 'light'
              ? 'hover:bg-slate-100 text-slate-600'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Canvas Settings Menu Modal Trigger */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.currentTarget.blur();
            setIsSettingsOpen(true);
          }}
          title="Open Canvas Settings"
          aria-label="Open canvas settings"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            themeMode === 'light'
              ? 'hover:bg-slate-100 text-slate-600'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Search & All Notes Sidebar */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenNotesList();
          }}
          title="Open Notes Finder & List"
          aria-label="Open notes list"
          className={`p-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
            themeMode === 'light'
              ? 'hover:bg-slate-100 text-slate-600'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Professional Desktop Preferences Modal */}
      <CanvasSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        gridType={gridType}
        onChangeGridType={onChangeGridType}
        snapToGrid={snapToGrid}
        onToggleSnapToGrid={onToggleSnapToGrid}
        showConnections={showConnections}
        onToggleConnections={onToggleConnections}
        showStatusBar={showStatusBar}
        onToggleStatusBar={onToggleStatusBar || (() => {})}
        checkForUpdatesOnLaunch={checkForUpdatesOnLaunch}
        onToggleCheckForUpdates={onToggleCheckForUpdates || (() => {})}
        notes={notes}
        zoom={zoom}
        onExportBackup={onExportBackup}
        onTriggerImportFile={() => {
          setIsSettingsOpen(false);
          fileInputRef.current?.click();
        }}
        onOpenAbout={onOpenAbout}
        onOpenAISettings={onOpenAISettings}
        onOpenShortcutsModal={onOpenShortcutsModal}
        enableAIServices={enableAIServices}
      />
    </>
  );
};

export const CanvasControls = React.memo(CanvasControlsComponent);
