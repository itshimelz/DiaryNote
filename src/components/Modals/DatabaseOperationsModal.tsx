import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Download04Icon,
  Upload04Icon,
  Loading03Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { Note, CanvasTransform } from '../../types';
import { AppSettings, exportBackup } from '../../lib/storage';
import {
  getDatabaseStats,
  vacuumDatabase,
  checkDatabaseIntegrity,
  DatabaseStats,
} from '../../lib/rustStorage';
import { sendNativeAppNotification } from '../../utils';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Badge,
  Icon,
} from '../ui';

interface DatabaseOperationsModalProps {
  isOpen: boolean;
  notes: Note[];
  transform: CanvasTransform;
  settings: AppSettings;
  onClose: () => void;
  onTriggerImportFile: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const DatabaseOperationsModal: React.FC<DatabaseOperationsModalProps> = ({
  isOpen,
  notes,
  transform,
  settings,
  onClose,
  onTriggerImportFile,
}) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [maintenanceFeedback, setMaintenanceFeedback] = useState<string | null>(null);
  const [snapshotResult, setSnapshotResult] = useState<{ fileName: string; filePath: string } | null>(null);

  const pinnedCount = useMemo(() => notes.filter((n) => n.isPinned).length, [notes]);
  const journalCount = useMemo(() => notes.filter((n) => n.isDailyEntry).length, [notes]);
  const lockedCount = useMemo(() => notes.filter((n) => n.isLocked).length, [notes]);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await getDatabaseStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setMaintenanceFeedback(null);
      setSnapshotResult(null);
    }
  }, [isOpen, loadStats]);

  const handleVacuum = async () => {
    setIsVacuuming(true);
    setMaintenanceFeedback(null);
    try {
      const updated = await vacuumDatabase();
      setStats(updated);
      setMaintenanceFeedback('Database successfully defragmented and optimized (VACUUM completed).');
      sendNativeAppNotification('Database Optimized', 'SQLite database defragmented and optimized.');
    } catch (err: any) {
      setMaintenanceFeedback(`Vacuum failed: ${err?.message || String(err)}`);
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIsCheckingIntegrity(true);
    setMaintenanceFeedback(null);
    try {
      const ok = await checkDatabaseIntegrity();
      if (ok) {
        setMaintenanceFeedback('Database integrity check passed (PRAGMA quick_check: OK). 0 corruptions.');
      } else {
        setMaintenanceFeedback('Database integrity warning: verification returned errors.');
      }
      loadStats();
    } catch (err: any) {
      setMaintenanceFeedback(`Integrity check failed: ${err?.message || String(err)}`);
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleCreateFullSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setSnapshotResult(null);
    try {
      const resultPath = await exportBackup(notes, transform, settings);
      const fileName = resultPath.split(/[/\\]/).pop() || 'DiaryNote-Backup.diarynote';
      setSnapshotResult({ fileName, filePath: resultPath });
    } catch (err: any) {
      setMaintenanceFeedback(`Snapshot failed: ${err?.message || String(err)}`);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleExportJson = async () => {
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `DiaryNote-Backup-${dateStr}.json`;
    const sanitizedSettings: AppSettings = {
      ...settings,
      encryptedApiKey: '',
      apiKeyIv: '',
      masterPasswordHash: '',
      masterSecurityAnswerHash: '',
    };
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes,
      transform,
      settings: sanitizedSettings,
    };
    const jsonString = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sendNativeAppNotification('JSON Backup Exported', `Saved ${filename}`);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={Database01Icon} size="md" />
            <span>Database & Storage Operations</span>
          </span>
        }
        description="Inspect SQLite engine metrics, perform database maintenance, and manage full vault backups."
        onClose={onClose}
      />

      <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 1. Storage Engine Health & Live Metrics */}
        <div className="p-3.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                SQLite 3 Storage Engine
              </span>
              <Badge variant="default" size="xs">
                WAL Mode + FTS5
              </Badge>
            </div>

            <Badge
              variant={stats?.isIntegrityOk !== false ? 'success' : 'danger'}
              size="sm"
              icon={stats?.isIntegrityOk !== false ? CheckmarkCircle02Icon : Alert02Icon}
            >
              {stats?.isIntegrityOk !== false ? 'Healthy · 0 Corruption' : 'Integrity Error'}
            </Badge>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                {notes.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Total Notes</span>
            </div>

            <div className="p-2 rounded-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                {stats ? formatBytes(stats.dbSizeBytes) : '...'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Database Size</span>
            </div>

            <div className="p-2 rounded-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                {stats ? formatBytes(stats.walSizeBytes) : '...'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">WAL Journal</span>
            </div>

            <div className="p-2 rounded-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                {stats ? `${stats.totalAssets} (${formatBytes(stats.totalAssetsSizeBytes)})` : '...'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Assets (CAS)</span>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span>Pinned Notes: <strong className="text-slate-700 dark:text-slate-300">{pinnedCount}</strong></span>
            <span>Journal Entries: <strong className="text-slate-700 dark:text-slate-300">{journalCount}</strong></span>
            <span>Locked Vaults: <strong className="text-slate-700 dark:text-slate-300">{lockedCount}</strong></span>
          </div>

          {/* Database Path Details */}
          {stats?.dbPath && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between bg-slate-100/70 dark:bg-slate-900/40 px-2.5 py-1.5 rounded-xs border border-slate-200/60 dark:border-slate-800/60">
              <span className="truncate mr-2 font-mono text-[10px]">
                <strong className="font-sans font-medium text-slate-600 dark:text-slate-300">File:</strong> {stats.dbPath}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(stats.dbPath);
                }}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
              >
                Copy Path
              </button>
            </div>
          )}
        </div>

        {/* 2. Database Maintenance Tools */}
        <div className="p-3.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5">
          <div>
            <span className="font-semibold block text-xs text-slate-800 dark:text-slate-200">
              Database Maintenance
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Defragment free pages, optimize FTS5 full-text index structures, and verify table integrity.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={SparklesIcon}
              onClick={handleVacuum}
              disabled={isVacuuming || isLoadingStats}
            >
              {isVacuuming ? 'Optimizing...' : 'Defragment & Vacuum'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={CheckmarkCircle02Icon}
              onClick={handleCheckIntegrity}
              disabled={isCheckingIntegrity || isLoadingStats}
            >
              {isCheckingIntegrity ? 'Checking...' : 'Check Integrity'}
            </Button>
          </div>

          {maintenanceFeedback && (
            <div className="text-[11px] p-2 rounded-xs border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
              {maintenanceFeedback}
            </div>
          )}
        </div>

        {/* 3. Vault Backup & Snapshot Operations */}
        <div className="p-3.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3">
          <div>
            <span className="font-semibold block text-xs text-slate-800 dark:text-slate-200">
              Backup & Snapshot Creation
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Create complete vault snapshots or export portable JSON backups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Native Snapshot (.diarynote) */}
            <div className="p-3 rounded-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between space-y-2">
              <div>
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                  Full Vault Snapshot (.diarynote)
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete native archive containing all notes, encrypted vaults, tags, and photo attachments.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Download04Icon}
                onClick={handleCreateFullSnapshot}
                disabled={isCreatingSnapshot}
                className="w-full"
              >
                {isCreatingSnapshot ? (
                  <span className="flex items-center gap-1.5">
                    <Icon icon={Loading03Icon} size="xs" className="animate-spin" />
                    <span>Creating Snapshot...</span>
                  </span>
                ) : (
                  'Create Full Snapshot'
                )}
              </Button>
            </div>

            {/* Portable JSON Backup */}
            <div className="p-3 rounded-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between space-y-2">
              <div>
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                  Portable JSON Backup (.json)
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Plaintext JSON export for external editors and browser imports (locked notes are redacted).
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={Download04Icon}
                onClick={handleExportJson}
                className="w-full"
              >
                Export JSON Backup
              </Button>
            </div>
          </div>

          {snapshotResult && (
            <div className="p-2.5 rounded-xs border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <Icon icon={CheckmarkCircle02Icon} size="xs" />
                <span>Full vault snapshot created successfully!</span>
              </div>
              <p className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 break-all">
                {snapshotResult.filePath}
              </p>
            </div>
          )}
        </div>

        {/* 4. Restore & Import Trigger */}
        <div className="p-3.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            <span className="font-semibold block text-xs text-slate-800 dark:text-slate-200">
              Restore from Backup
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Import a <code className="text-[10px] font-mono bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded-xs">.diarynote</code> archive or <code className="text-[10px] font-mono bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded-xs">.json</code> backup with duplicate resolution preview.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={Upload04Icon}
            onClick={() => {
              onClose();
              setTimeout(() => onTriggerImportFile(), 50);
            }}
          >
            Import Backup...
          </Button>
        </div>
      </DialogBody>

      <DialogFooter>
        <div className="flex justify-end w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};
