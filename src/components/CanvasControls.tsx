import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Grid2X2,
  Settings,
  X,
  Share2,
  Download,
  Upload,
  RotateCcw,
  Info,
  Keyboard,
  PanelBottom,
  Calendar,
  Flame,
} from 'lucide-react';
import { CURRENT_VERSION } from '../utils/updateChecker';

interface CanvasControlsProps {
  notes?: Note[];
  zoom: number;
  gridType: GridType;
  themeMode: CanvasTheme;
  snapToGrid: boolean;
  showConnections: boolean;
  hasBatchBar?: boolean;
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
  onOpenSearch: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenAbout?: () => void;
  showStatusBar?: boolean;
  onToggleStatusBar?: () => void;
}

const CanvasControlsComponent: React.FC<CanvasControlsProps> = ({
  notes = [],
  zoom,
  gridType,
  themeMode,
  snapToGrid,
  showConnections,
  hasBatchBar = false,
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
  onOpenSearch,
  onOpenShortcutsModal,
  onOpenAbout,
  showStatusBar = true,
  onToggleStatusBar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  const zoomPercent = Math.round(zoom * 100);
  const pinnedCount = notes.filter((n) => n.isPinned).length;

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
      <div className="w-full flex items-center justify-between gap-1.5 p-1.5 text-xs transition-all">
        <div className="flex items-center gap-1.5">
          {/* Create Note CTA */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onAddNote();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold tracking-wider uppercase text-[11px] rounded-md shadow transition-colors ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
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
              className={`p-1.5 rounded-md transition-all ${
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
        <div className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
          themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
        }`}>
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
                ? themeMode === 'light' ? 'hover:bg-slate-200/80 text-slate-700' : 'hover:bg-slate-700 text-slate-200'
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
                ? themeMode === 'light' ? 'hover:bg-slate-200/80 text-slate-700' : 'hover:bg-slate-700 text-slate-200'
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
          className={`p-1.5 rounded-md transition-all ${
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
        <div className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
          themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
        }`}>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onZoomOut();
            }}
            title="Zoom Out (Ctrl -)"
            aria-label="Zoom out"
            className={`p-1.5 rounded-md transition-colors ${
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
            className={`px-2 font-mono text-[11px] font-medium ${
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
            className={`p-1.5 rounded-md transition-colors ${
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
            className={`p-1.5 rounded-md transition-colors border-l ml-0.5 ${
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
          className={`p-1.5 rounded-md transition-colors ${
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
          className={`p-1.5 rounded-md transition-colors ${
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
          className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
            themeMode === 'light'
              ? 'hover:bg-slate-100 text-slate-600'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Settings Modal */}
      {isSettingsOpen &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in select-none font-sans ${
              themeMode === 'dark' ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
            }`}
            onClick={() => setIsSettingsOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-md shadow-sm border p-5 overflow-hidden transition-all duration-200 ${
                themeMode === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between pb-3 mb-3.5 border-b transition-colors ${
                  themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className={`w-4 h-4 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
                  <h2 className="font-bold text-sm tracking-tight">Canvas Settings</h2>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={`p-1 rounded-sm transition-colors ${
                    themeMode === 'dark'
                      ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Settings Options List */}
              <div className="space-y-3 text-xs">
                {/* Snap to Grid Toggle Option */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/60'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div>
                    <div
                      className={`font-semibold flex items-center gap-1.5 ${
                        themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      <Grid2X2 className={`w-4 h-4 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
                      <span>Snap to Grid</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {snapToGrid
                        ? 'Grid aligned: note positions & sizes snap to 24px increments'
                        : 'Free-form: smooth pixel placement anywhere on canvas'}
                    </p>
                  </div>
                  <button
                    onClick={onToggleSnapToGrid}
                    className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 cursor-pointer ${
                      snapToGrid
                        ? themeMode === 'dark' ? 'bg-slate-100' : 'bg-slate-900'
                        : themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full shadow-xs transition-transform ${
                        snapToGrid
                          ? `translate-x-4.5 ${themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'}`
                          : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Connection Lines Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/60'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div>
                    <div
                      className={`font-semibold flex items-center gap-1.5 ${
                        themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      <Share2 className={`w-4 h-4 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
                      <span>Connection Lines</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Draw curved lines between notes referencing `@Note`
                    </p>
                  </div>
                  <button
                    onClick={onToggleConnections}
                    className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 cursor-pointer ${
                      showConnections
                        ? themeMode === 'dark' ? 'bg-slate-100' : 'bg-slate-900'
                        : themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full shadow-xs transition-transform ${
                        showConnections
                          ? `translate-x-4.5 ${themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'}`
                          : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Bottom Status Bar Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/60'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div>
                    <div
                      className={`font-semibold flex items-center gap-1.5 ${
                        themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      <PanelBottom className={`w-4 h-4 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
                      <span>Bottom Status Bar</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Display live canvas stats, selection count, and word counter at bottom
                    </p>
                  </div>
                  <button
                    onClick={onToggleStatusBar}
                    className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 cursor-pointer ${
                      showStatusBar
                        ? themeMode === 'dark' ? 'bg-slate-100' : 'bg-slate-900'
                        : themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full shadow-xs transition-transform ${
                        showStatusBar
                          ? `translate-x-4.5 ${themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'}`
                          : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* Grid Background Selection */}
                <div
                  className={`p-3 rounded-sm border transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/60'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <label
                    className={`font-semibold block mb-2 text-xs ${
                      themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    Canvas Grid Pattern
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['dots', 'grid', 'ruled', 'blank'] as GridType[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => onChangeGridType(g)}
                        className={`py-1 px-2 rounded-sm capitalize font-semibold text-[11px] border transition-all cursor-pointer ${
                          gridType === g
                            ? themeMode === 'dark'
                              ? 'bg-slate-100 text-slate-900 border-slate-100 shadow-xs'
                              : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : themeMode === 'dark'
                            ? 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Mode Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/60'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div>
                    <div
                      className={`font-semibold flex items-center gap-1.5 ${
                        themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      {themeMode === 'dark' ? (
                        <Moon className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <span>Canvas Dark Theme</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Toggle between light off-white canvas and dark graphite canvas
                    </p>
                  </div>
                  <button
                    onClick={onToggleTheme}
                    className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 cursor-pointer ${
                      themeMode === 'dark' ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                        themeMode === 'dark' ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Canvas Overview & Stats Card */}
                <div
                  className={`p-3 rounded-sm border transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/60'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div
                    className={`font-semibold flex items-center justify-between mb-2 ${
                      themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Info className={`w-3.5 h-3.5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
                      <span>Canvas Overview</span>
                    </div>
                    <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div
                      className={`p-1.5 rounded-sm border ${
                        themeMode === 'dark'
                          ? 'bg-slate-900/80 border-slate-700/80'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className={`block text-sm font-bold ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{notes.length}</span>
                      <span className={`text-[9px] font-mono ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Notes</span>
                    </div>
                    <div
                      className={`p-1.5 rounded-sm border ${
                        themeMode === 'dark'
                          ? 'bg-slate-900/80 border-slate-700/80'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className={`block text-sm font-bold ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{pinnedCount}</span>
                      <span className={`text-[9px] font-mono ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Pinned</span>
                    </div>
                    <div
                      className={`p-1.5 rounded-sm border ${
                        themeMode === 'dark'
                          ? 'bg-slate-900/80 border-slate-700/80'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className={`block text-sm font-bold ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{zoomPercent}%</span>
                      <span className={`text-[9px] font-mono ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Zoom</span>
                    </div>
                  </div>
                </div>

                {/* Import/Export Backup Data */}
                <div
                  className={`pt-2.5 border-t space-y-2 ${
                    themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex gap-2">
                    <button
                      onClick={onExportBackup}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Backup</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import Backup</span>
                    </button>
                  </div>

                  {onOpenAbout && (
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onOpenAbout();
                      }}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-blue-600/20 border-blue-500/40 hover:bg-blue-600/30 text-blue-300'
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>About DiaryNote (v{CURRENT_VERSION})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export const CanvasControls = React.memo(CanvasControlsComponent);
