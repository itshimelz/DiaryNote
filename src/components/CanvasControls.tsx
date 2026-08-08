import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Search,
  Settings,
  Shield,
  Eye,
  LayoutGrid,
} from 'lucide-react';

import { CanvasTheme, Note, GridType } from '../types';
import { BatchActionBar } from './BatchActionBar';
import { CanvasSettingsModal } from './CanvasSettingsModal';

export interface CanvasControlsProps {
  notes: Note[];
  themeMode: CanvasTheme;
  gridType: GridType;
  snapToGrid: boolean;
  showConnections: boolean;
  zoom?: number;
  selectedNoteIds?: string[];
  isLocked?: boolean;
  isPanMode?: boolean;
  transform?: any;
  hasBatchBar?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddNote?: () => void;
  onResetZoom?: () => void;
  onCenterNote?: (id: string) => void;
  onFitNotes?: () => void;
  onOpenNotesList?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitAll?: () => void;
  onOpenSearch?: () => void;
  onChangeGridType?: (grid: GridType) => void;
  onToggleTheme?: () => void;
  onToggleSnapToGrid?: () => void;
  onToggleConnections?: () => void;
  onExportBackup?: () => void;
  onTriggerImportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  onOpenSecurityModal?: () => void;
  onToggleZenMode?: () => void;
  onTogglePanMode?: () => void;
  onUpdateBatchNotes?: (notes: Note[]) => void;
  onDeleteNotes?: (ids: string[]) => void;
  onClearSelection?: () => void;
  onOpenShortcutsModal?: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom = 1,
  notes,
  selectedNoteIds = [],
  themeMode,
  gridType,
  snapToGrid,
  showConnections,
  isLocked = false,
  isPanMode = false,
  onZoomIn,
  onZoomOut,
  onFitAll,
  onOpenSearch,
  onChangeGridType,
  onToggleTheme,
  onToggleSnapToGrid,
  onToggleConnections,
  onExportBackup,
  onTriggerImportBackup,
  onOpenSecurityModal,
  onToggleZenMode,
  onTogglePanMode,
  onUpdateBatchNotes,
  onDeleteNotes,
  onClearSelection,
  onOpenShortcutsModal,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const zoomPercent = Math.round(zoom * 100);
  const pinnedCount = notes.filter((n) => n.isPinned).length;

  const barBg =
    themeMode === 'dark'
      ? 'bg-slate-900/90 border-slate-800/90 text-slate-100 shadow-sm backdrop-blur-md'
      : 'bg-white/90 border-slate-200/90 text-slate-800 shadow-sm backdrop-blur-md';

  const btnClass =
    themeMode === 'dark'
      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100';

  const activeBtnClass =
    themeMode === 'dark'
      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
      : 'bg-blue-50 text-blue-600 border border-blue-200';

  const borderClass = themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200/80';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-[95vw] pointer-events-none select-none font-sans">
      {/* Dynamic Main Floating Bar Container */}
      <div
        className={`pointer-events-auto rounded-md border flex flex-col overflow-hidden transition-all duration-200 ${barBg}`}
      >
        {/* Top Row Controls Bar */}
        <div className="flex items-center gap-1.5 p-1.5">
          {/* Quick Search & Command Palette Trigger Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all text-xs font-semibold ${
              themeMode === 'dark'
                ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/80'
            }`}
            title="Search notes & Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="hidden sm:inline">Search & Commands</span>
            <kbd
              className={`hidden md:inline-block px-1.5 py-0.2 font-mono text-[10px] rounded-xs border ${
                themeMode === 'dark'
                  ? 'bg-slate-900/80 border-slate-700 text-slate-400'
                  : 'bg-white border-slate-300 text-slate-500'
              }`}
            >
              Ctrl+K
            </kbd>
          </button>

          <div className={`h-4 w-px ${borderClass}`} />

          {/* Pan vs Select Mode Toggle */}
          <button
            type="button"
            onClick={onTogglePanMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-all ${
              isPanMode ? activeBtnClass : btnClass
            }`}
            title={isPanMode ? 'Switch to Select Mode (P)' : 'Switch to Canvas Pan Mode (P)'}
          >
            <span className="font-bold">{isPanMode ? 'Pan' : 'Select'}</span>
          </button>

          <div className={`h-4 w-px ${borderClass}`} />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={onZoomOut}
            className={`p-1.5 rounded-sm transition-all ${btnClass}`}
            title="Zoom Out (Ctrl + Scroll)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Percentage Reset Display */}
          <button
            type="button"
            onClick={onFitAll}
            className={`px-2 py-1 text-xs font-mono font-bold rounded-sm transition-all ${
              themeMode === 'dark'
                ? 'hover:bg-slate-800 text-slate-200'
                : 'hover:bg-slate-100 text-slate-800'
            }`}
            title="Reset Zoom to 100% / Fit All Notes (H)"
          >
            {zoomPercent}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={onZoomIn}
            className={`p-1.5 rounded-sm transition-all ${btnClass}`}
            title="Zoom In (Ctrl + Scroll)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Fit All Viewport */}
          <button
            type="button"
            onClick={onFitAll}
            className={`p-1.5 rounded-sm transition-all ${btnClass}`}
            title="Fit All Notes on Screen (F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className={`h-4 w-px ${borderClass}`} />

          {/* Zen Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleZenMode}
            className={`p-1.5 rounded-sm transition-all ${btnClass}`}
            title="Zen Mode: Hide UI (Z)"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Security Passcode Modal Trigger */}
          <button
            type="button"
            onClick={onOpenSecurityModal}
            className={`p-1.5 rounded-sm transition-all relative ${
              isLocked
                ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10'
                : btnClass
            }`}
            title={isLocked ? 'App is Passcode Protected' : 'Set Lock Screen Passcode'}
          >
            {isLocked ? (
              <Lock className="w-4 h-4 text-amber-500" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </button>

          <div className={`h-4 w-px ${borderClass}`} />

          {/* Settings Modal Open Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`p-1.5 rounded-sm transition-all ${btnClass}`}
            title="Canvas Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Select Batch Action Bar Component */}
        <AnimatePresence>
          {selectedNoteIds.length > 0 && (
            <BatchActionBar
              selectedNoteIds={selectedNoteIds}
              notes={notes}
              themeMode={themeMode}
              onUpdateBatchNotes={onUpdateBatchNotes}
              onDeleteNotes={onDeleteNotes}
              onClearSelection={onClearSelection}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Canvas Settings Modal Component */}
      <CanvasSettingsModal
        isOpen={isSettingsOpen}
        notes={notes}
        gridType={gridType}
        themeMode={themeMode}
        snapToGrid={snapToGrid}
        showConnections={showConnections}
        zoomPercent={zoomPercent}
        pinnedCount={pinnedCount}
        onClose={() => setIsSettingsOpen(false)}
        onChangeGridType={onChangeGridType}
        onToggleTheme={onToggleTheme}
        onToggleSnapToGrid={onToggleSnapToGrid}
        onToggleConnections={onToggleConnections}
        onExportBackup={onExportBackup}
        onTriggerImportBackup={onTriggerImportBackup}
        onOpenShortcutsModal={onOpenShortcutsModal}
      />
    </div>
  );
};
