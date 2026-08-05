import React, { useState, useRef } from 'react';
import { CanvasTransform, GridType, CanvasTheme } from '../types';
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
} from 'lucide-react';

interface CanvasControlsProps {
  transform: CanvasTransform;
  gridType: GridType;
  themeMode: CanvasTheme;
  snapToGrid: boolean;
  showConnections: boolean;
  onAddNote: () => void;
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
  onResetSampleNotes: () => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSearch: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  transform,
  gridType,
  themeMode,
  snapToGrid,
  showConnections,
  onAddNote,
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
  onResetSampleNotes,
  isPanMode,
  onTogglePanMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSearch,
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

  const zoomPercent = Math.round(transform.zoom * 100);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Primary Floating Action Bar at Bottom Center */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-lg shadow-xl backdrop-blur-xl text-xs transition-colors ${
        themeMode === 'light'
          ? 'bg-white/95 border border-slate-200 text-slate-800'
          : 'bg-slate-900/90 border border-slate-800 text-slate-200'
      }`}>
        {/* Create Note CTA */}
        <button
          onClick={onAddNote}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-bold tracking-wider uppercase text-[11px] rounded-md shadow transition-all hover:scale-105 active:scale-95 ${
            themeMode === 'light'
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-white text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Undo & Redo Controls */}
        <div className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
          themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
        }`}>
          <button
            onClick={onUndo}
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
            onClick={onRedo}
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
          onClick={onTogglePanMode}
          title={isPanMode ? 'Pan Mode (Active) - Click to switch to Select' : 'Select Mode - Click to switch to Pan'}
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
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
            className={`p-1.5 rounded-md transition-colors ${
              themeMode === 'light' ? 'hover:bg-slate-200/80 text-slate-600' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetZoom}
            title="Click to reset zoom to 100%"
            className={`px-2 font-mono text-[11px] font-medium ${
              themeMode === 'light' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
            }`}
          >
            {zoomPercent}%
          </button>

          <button
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
            className={`p-1.5 rounded-md transition-colors ${
              themeMode === 'light' ? 'hover:bg-slate-200/80 text-slate-600' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitNotes}
            title="Fit All Notes on Canvas"
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

        {/* Grid Background Switcher */}
        <div className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
          themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
        }`}>
          {(['dots', 'grid', 'ruled', 'blank'] as GridType[]).map((g) => (
            <button
              key={g}
              onClick={() => onChangeGridType(g)}
              title={`Canvas background: ${g}`}
              className={`px-2 py-1 rounded-md capitalize text-[11px] transition-all ${
                gridType === g
                  ? themeMode === 'light'
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'bg-slate-700 text-white font-semibold shadow-sm'
                  : themeMode === 'light'
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Monochromatic Canvas Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${themeMode === 'dark' ? 'Monochrome Light' : 'Monochrome Dark'} Canvas`}
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
          onClick={() => setIsSettingsOpen(true)}
          title="Open Canvas Settings"
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
          onClick={onOpenNotesList}
          title="Open Notes Finder & List"
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
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-xl shadow-2xl border p-5 overflow-hidden transition-all ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between pb-3.5 mb-4 border-b ${
              themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Settings className={`w-5 h-5 ${themeMode === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <h2 className="font-bold text-base tracking-tight">Canvas Settings</h2>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`p-1 rounded-md transition-colors ${
                  themeMode === 'dark'
                    ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Options List */}
            <div className="space-y-3.5 text-xs">
              {/* Snap to Grid Toggle Option */}
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                themeMode === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/60'
                  : 'bg-slate-50 border-slate-200/90'
              }`}>
                <div>
                  <div className={`font-semibold flex items-center gap-1.5 ${
                    themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    <Grid2X2 className={`w-4 h-4 ${themeMode === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span>Snap to Grid</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${
                    themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {snapToGrid
                      ? 'Grid aligned: note positions & sizes snap to 24px increments'
                      : 'Free-form: smooth pixel placement anywhere on canvas'}
                  </p>
                </div>
                <button
                  onClick={onToggleSnapToGrid}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 ${
                    snapToGrid
                      ? 'bg-blue-600'
                      : themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      snapToGrid ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Show Connection Lines Toggle */}
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                themeMode === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/60'
                  : 'bg-slate-50 border-slate-200/90'
              }`}>
                <div>
                  <div className={`font-semibold flex items-center gap-1.5 ${
                    themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    <Share2 className={`w-4 h-4 ${themeMode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span>Connection Lines</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${
                    themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Draw curved lines between notes referencing `@Note`
                  </p>
                </div>
                <button
                  onClick={onToggleConnections}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 ${
                    showConnections
                      ? 'bg-indigo-600'
                      : themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      showConnections ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Grid Background Selection */}
              <div className={`p-3 rounded-lg border transition-colors ${
                themeMode === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/60'
                  : 'bg-slate-50 border-slate-200/90'
              }`}>
                <label className={`font-semibold block mb-2 ${
                  themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  Canvas Grid Pattern
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['dots', 'grid', 'ruled', 'blank'] as GridType[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => onChangeGridType(g)}
                      className={`py-1.5 px-2 rounded-md capitalize font-medium text-[11px] border transition-all ${
                        gridType === g
                          ? themeMode === 'dark'
                            ? 'bg-slate-100 text-slate-900 border-slate-100 font-semibold shadow-sm'
                            : 'bg-slate-900 text-white border-slate-900 font-semibold shadow-sm'
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
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                themeMode === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/60'
                  : 'bg-slate-50 border-slate-200/90'
              }`}>
                <div>
                  <div className={`font-semibold flex items-center gap-1.5 ${
                    themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {themeMode === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span>Canvas Dark Theme</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${
                    themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Toggle between light off-white canvas and dark graphite canvas
                  </p>
                </div>
                <button
                  onClick={onToggleTheme}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ml-3 ${
                    themeMode === 'dark'
                      ? 'bg-amber-500'
                      : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      themeMode === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Import/Export Backup Data */}
              <div className={`pt-2.5 border-t space-y-2 ${
                themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex gap-2">
                  <button
                    onClick={onExportBackup}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-medium transition-colors ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Download className={`w-3.5 h-3.5 ${themeMode === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span>Export Backup</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-medium transition-colors ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Upload className={`w-3.5 h-3.5 ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Import Backup</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Reset sample notes? This will restore the default guide notes.')) {
                      onResetSampleNotes();
                      setIsSettingsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-colors text-[11px] ${
                    themeMode === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Default Sample Notes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
