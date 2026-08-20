import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CanvasSettingsModal } from '../Modals/CanvasSettingsModal';
import { Note } from '../../types';

const mockNotes: Note[] = [];

describe('CanvasSettingsModal Component', () => {
  const onClose = vi.fn();
  const onToggleTheme = vi.fn();
  const onChangeGridType = vi.fn();
  const onToggleSnapToGrid = vi.fn();
  const onToggleConnections = vi.fn();
  const onToggleStatusBar = vi.fn();
  const onToggleCheckForUpdates = vi.fn();
  const onExportBackup = vi.fn();
  const onTriggerImportFile = vi.fn();
  const onOpenSecurityModal = vi.fn();
  const onLockSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default Canvas & Grid tab and navigation', () => {
    render(
      <CanvasSettingsModal
        isOpen={true}
        onClose={onClose}
        themeMode="dark"
        onToggleTheme={onToggleTheme}
        gridType="dots"
        onChangeGridType={onChangeGridType}
        snapToGrid={true}
        onToggleSnapToGrid={onToggleSnapToGrid}
        showConnections={true}
        onToggleConnections={onToggleConnections}
        showStatusBar={true}
        onToggleStatusBar={onToggleStatusBar}
        checkForUpdatesOnLaunch={true}
        onToggleCheckForUpdates={onToggleCheckForUpdates}
        notes={mockNotes}
        zoom={1}
        onExportBackup={onExportBackup}
        onTriggerImportFile={onTriggerImportFile}
      />
    );

    expect(screen.getByText('Canvas Preferences')).toBeDefined();
    expect(screen.getByText('Canvas & Grid')).toBeDefined();
    expect(screen.getByText('Appearance')).toBeDefined();
    expect(screen.getByText('Data & Backup')).toBeDefined();
    expect(screen.getByText('Security & Lock')).toBeDefined();
  });

  it('switches to Security & Lock tab and displays vault settings', () => {
    render(
      <CanvasSettingsModal
        isOpen={true}
        onClose={onClose}
        themeMode="dark"
        onToggleTheme={onToggleTheme}
        gridType="dots"
        onChangeGridType={onChangeGridType}
        snapToGrid={true}
        onToggleSnapToGrid={onToggleSnapToGrid}
        showConnections={true}
        onToggleConnections={onToggleConnections}
        showStatusBar={true}
        onToggleStatusBar={onToggleStatusBar}
        checkForUpdatesOnLaunch={true}
        onToggleCheckForUpdates={onToggleCheckForUpdates}
        notes={mockNotes}
        zoom={1}
        onExportBackup={onExportBackup}
        onTriggerImportFile={onTriggerImportFile}
        masterPasswordHash="hashed_pass"
        masterSecurityQuestion="What is your pet?"
        isMasterUnlocked={true}
        onLockSession={onLockSession}
        onOpenSecurityModal={onOpenSecurityModal}
      />
    );

    const securityNavBtn = screen.getByText('Security & Lock');
    fireEvent.click(securityNavBtn);

    expect(screen.getByText('Vault & Security Settings')).toBeDefined();
    expect(screen.getByText('Configured')).toBeDefined();
    expect(screen.getByText('Change Passcode')).toBeDefined();
    expect(screen.getByText('Reset Passcode')).toBeDefined();
    expect(screen.getByText('Update Recovery Question')).toBeDefined();
    expect(screen.getByText('Remove Passcode')).toBeDefined();
  });
});
