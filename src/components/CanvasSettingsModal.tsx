import React from 'react';
import { createPortal } from 'react-dom';
import { Note, GridType, CanvasTheme } from '../types';
import {
  Settings,
  X,
  Grid2X2,
  Share2,
  Moon,
  Sun,
  Info,
  Download,
  Upload,
  Keyboard,
} from 'lucide-react';

export interface CanvasSettingsModalProps {
  isOpen: boolean;
  notes: Note[];
  gridType: GridType;
  themeMode: CanvasTheme;
  snapToGrid: boolean;
  showConnections: boolean;
  zoomPercent: number;
  pinnedCount: number;
  onClose: () => void;
  onChangeGridType: (grid: GridType) => void;
  onToggleTheme: () => void;
  onToggleSnapToGrid: () => void;
  onToggleConnections: () => void;
  onExportBackup: () => void;
  onTriggerImportBackup: () => void;
  onOpenShortcutsModal?: () => void;
}

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  isOpen,
  notes,
  gridType,
  themeMode,
  snapToGrid,
  showConnections,
  zoomPercent,
  pinnedCount,
  onClose,
  onChangeGridType,
  onToggleTheme,
  onToggleSnapToGrid,
  onToggleConnections,
  onExportBackup,
  onTriggerImportBackup,
  onOpenShortcutsModal,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in select-none font-sans ${
        themeMode === 'dark' ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
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
            onClick={onClose}
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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onExportBackup();
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm font-semibold border transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onTriggerImportBackup();
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm font-semibold border transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Backup</span>
              </button>
            </div>

            {onOpenShortcutsModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenShortcutsModal();
                }}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm font-semibold border transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-slate-800/80 border-slate-700/80 text-blue-400 hover:bg-slate-700'
                    : 'bg-blue-50/80 border-blue-200/80 text-blue-700 hover:bg-blue-100/80'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Keyboard Shortcuts (Ctrl+/)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
