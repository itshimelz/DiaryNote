import React, { useState, useRef } from 'react';
import { GridType, CanvasTheme, Note } from '../types';
import {
  Add01Icon,
  Image01Icon,
  Calendar03Icon,
  UndoIcon,
  RedoIcon,
  MoveIcon,
  Cursor01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
  Maximize01Icon,
  Sun01Icon,
  Moon01Icon,
  Settings02Icon,
  ListViewIcon,
} from '@hugeicons/core-free-icons';
import { CanvasSettingsModal } from './Modals/CanvasSettingsModal';
import { Button, IconButton } from './ui';

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
  onAddImageFiles?: (files: File[]) => void;
  onOpenTodayJournal?: () => void;
  onOpenJournalCalendar?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitNotes: () => void;
  onChangeGridType: (grid: GridType) => void;
  onToggleTheme: () => void;
  onChangeThemeMode?: (mode: CanvasTheme) => void;
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
  onOpenDatabaseOperations?: () => void;
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
  onAddImageFiles,
  onOpenTodayJournal,
  onOpenJournalCalendar,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitNotes,
  onChangeGridType,
  onToggleTheme,
  onChangeThemeMode,
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
  onOpenDatabaseOperations,
  enableAIServices = false,
  onOpenAISettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSettingsOpen(false);
      onImportBackup(file);
      e.target.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onAddImageFiles?.(imageFiles);
      }
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
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Primary Control Bar Row inside Unified Dock */}
      <div className="w-full flex items-center justify-between gap-1.5 p-1.5 text-xs transition-colors select-none font-sans">
        <div className="flex items-center gap-1.5">
          {/* Create Note CTA */}
          <Button
            size="sm"
            variant="primary"
            icon={Add01Icon}
            onClick={(e) => {
              e.currentTarget.blur();
              onAddNote();
            }}
          >
            New Note
          </Button>

          {/* Add Image CTA */}
          {onAddImageFiles && (
            <Button
              size="sm"
              variant="ghost"
              icon={Image01Icon}
              onClick={(e) => {
                e.currentTarget.blur();
                imageInputRef.current?.click();
              }}
              title="Add Image or Polaroid Card"
            >
              <span className="hidden sm:inline">Add Image</span>
            </Button>
          )}

          {/* Today's Journal CTA */}
          {onOpenTodayJournal && (
            <Button
              size="sm"
              variant="ghost"
              icon={Calendar03Icon}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTodayJournal();
              }}
              title="Today's Journal Entry (Ctrl+Shift+D)"
            >
              <span className="hidden sm:inline">Today</span>
            </Button>
          )}

          {/* Journal Calendar CTA */}
          {onOpenJournalCalendar && (
            <IconButton
              size="sm"
              variant="ghost"
              icon={Calendar03Icon}
              aria-label="Open journal calendar"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenJournalCalendar();
              }}
              title="Open Journal Calendar"
            />
          )}
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Undo & Redo Controls */}
        <div
          className={`flex items-center gap-0.5 rounded-sm p-0.5 border ${
            themeMode === 'light'
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/80 border-slate-700/50'
          }`}
        >
          <IconButton
            size="xs"
            variant="ghost"
            icon={UndoIcon}
            aria-label="Undo"
            disabled={!canUndo}
            onClick={(e) => {
              e.currentTarget.blur();
              onUndo();
            }}
            title="Undo (Ctrl+Z)"
          />
          <IconButton
            size="xs"
            variant="ghost"
            icon={RedoIcon}
            aria-label="Redo"
            disabled={!canRedo}
            onClick={(e) => {
              e.currentTarget.blur();
              onRedo();
            }}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          />
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Pan vs Select Mode */}
        <IconButton
          size="sm"
          variant={isPanMode ? 'primary' : 'ghost'}
          icon={isPanMode ? MoveIcon : Cursor01Icon}
          aria-label={isPanMode ? 'Switch to select mode' : 'Switch to pan mode'}
          onClick={(e) => {
            e.currentTarget.blur();
            onTogglePanMode();
          }}
          title={
            isPanMode
              ? 'Pan Mode (Active) - Click to switch to Select'
              : 'Select Mode - Click to switch to Pan'
          }
        />

        {/* Zoom Controls */}
        <div
          className={`flex items-center gap-0.5 rounded-sm p-0.5 border ${
            themeMode === 'light'
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/80 border-slate-700/50'
          }`}
        >
          <IconButton
            size="xs"
            variant="ghost"
            icon={ZoomOutAreaIcon}
            aria-label="Zoom out"
            onClick={(e) => {
              e.currentTarget.blur();
              onZoomOut();
            }}
            title="Zoom Out (Ctrl -)"
          />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              onResetZoom();
            }}
            title="Click to reset zoom to 100%"
            aria-label="Reset zoom to 100 percent"
            className={`px-2 font-mono text-[11px] font-medium cursor-pointer ${
              themeMode === 'light'
                ? 'text-slate-700 hover:text-slate-900'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {zoomPercent}%
          </button>

          <IconButton
            size="xs"
            variant="ghost"
            icon={ZoomInAreaIcon}
            aria-label="Zoom in"
            onClick={(e) => {
              e.currentTarget.blur();
              onZoomIn();
            }}
            title="Zoom In (Ctrl +)"
          />

          <div className="border-l border-slate-200 dark:border-slate-700/50 ml-0.5 pl-0.5">
            <IconButton
              size="xs"
              variant="ghost"
              icon={Maximize01Icon}
              aria-label="Fit all notes on canvas"
              onClick={(e) => {
                e.currentTarget.blur();
                onFitNotes();
              }}
              title="Fit All Notes on Canvas"
            />
          </div>
        </div>

        <div className={`h-5 w-px mx-1 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Monochromatic Canvas Theme Toggle */}
        <IconButton
          size="sm"
          variant="ghost"
          icon={themeMode === 'dark' ? Sun01Icon : Moon01Icon}
          aria-label="Change canvas theme"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleTheme();
          }}
          title={`Switch to ${themeMode === 'dark' ? 'Monochrome Light' : 'Monochrome Dark'} Canvas`}
        />

        {/* Canvas Settings Menu Modal Trigger */}
        <IconButton
          size="sm"
          variant="ghost"
          icon={Settings02Icon}
          aria-label="Open canvas settings"
          onClick={(e) => {
            e.currentTarget.blur();
            setIsSettingsOpen(true);
          }}
          title="Open Canvas Settings"
        />

        {/* Search & All Notes Sidebar */}
        <IconButton
          size="sm"
          variant="ghost"
          icon={ListViewIcon}
          aria-label="Open notes list"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenNotesList();
          }}
          title="Open Notes Finder & List"
        />
      </div>

      {/* Professional Desktop Preferences Modal */}
      <CanvasSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        onChangeThemeMode={onChangeThemeMode}
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
        onOpenDatabaseOperations={onOpenDatabaseOperations}
        enableAIServices={enableAIServices}
      />
    </>
  );
};

export const CanvasControls = React.memo(CanvasControlsComponent);
