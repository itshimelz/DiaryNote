import React, { useState } from 'react';
import {
  InformationCircleIcon,
  RotateLeft01Icon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  BookOpen01Icon,
  Layers01Icon,
  SecurityLockIcon,
  Globe02Icon,
  LinkSquare02Icon,
  GithubIcon,
} from '@hugeicons/core-free-icons';
import {
  CURRENT_VERSION,
  REPO_URL,
  checkForAppUpdates,
  ReleaseInfo,
} from '../../utils/updateChecker';
import { CanvasTheme } from '../../types';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Badge, Icon } from '../ui';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode?: CanvasTheme;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  themeMode: _themeMode,
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    latestRelease?: ReleaseInfo;
    message?: string;
  }>({ checked: false, hasUpdate: false });

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult({ checked: false, hasUpdate: false });

    const result = await checkForAppUpdates();
    setCheckingUpdate(false);

    if (result.updateAvailable && result.latestRelease) {
      setUpdateResult({
        checked: true,
        hasUpdate: true,
        latestRelease: result.latestRelease,
        message: `Version ${result.latestRelease.tagName} is available!`,
      });
    } else {
      setUpdateResult({
        checked: true,
        hasUpdate: false,
        message: `You are on the latest version (v${CURRENT_VERSION})!`,
      });
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={InformationCircleIcon} size="md" />
            <span>About DiaryNote</span>
          </span>
        }
        onClose={onClose}
      />

      <DialogBody className="space-y-4 text-xs pr-1">
        {/* Main App Title Banner */}
        <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <Icon icon={BookOpen01Icon} size="md" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-100">
                  DiaryNote
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Desktop Canvas Workspace & Graph Journal
                </p>
              </div>
            </div>
            <Badge variant="default" size="sm">
              v{CURRENT_VERSION}
            </Badge>
          </div>
        </div>

        {/* Version & Live Update Checker Card */}
        <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold block text-slate-900 dark:text-slate-100">
              Release Channel
            </span>
            <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-400">
              v{CURRENT_VERSION} (Installed)
            </p>
          </div>

          <Button
            size="xs"
            variant="secondary"
            icon={RotateLeft01Icon}
            loading={checkingUpdate}
            onClick={handleCheckUpdate}
          >
            {checkingUpdate ? 'Checking...' : 'Check Updates'}
          </Button>
        </div>

        {/* Update Check Result Banner */}
        {updateResult.checked && (
          <div
            className={`p-2.5 rounded-sm border flex items-start gap-2 animate-in fade-in transition-colors ${
              updateResult.hasUpdate
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
            }`}
          >
            {updateResult.hasUpdate ? (
              <Icon icon={SparklesIcon} size="sm" className="shrink-0 mt-0.5 text-amber-500" />
            ) : (
              <Icon
                icon={CheckmarkCircle02Icon}
                size="sm"
                className="shrink-0 mt-0.5 text-emerald-500"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs">{updateResult.message}</p>
              {updateResult.hasUpdate && updateResult.latestRelease && (
                <a
                  href={updateResult.latestRelease.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold underline hover:opacity-80"
                >
                  <span>Download {updateResult.latestRelease.tagName} on GitHub</span>
                  <Icon icon={LinkSquare02Icon} size="xs" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Feature Highlights Overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200 mb-0.5">
              <Icon icon={Layers01Icon} size="sm" />
              <span>Infinite Canvas</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Visual note placement, zoom, and spatial links.
            </p>
          </div>

          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200 mb-0.5">
              <Icon icon={SecurityLockIcon} size="sm" />
              <span>Local Privacy</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Passcode protection & offline storage.
            </p>
          </div>
        </div>

        {/* Repository & License Details */}
        <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Repository</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 hover:underline"
            >
              <Icon icon={GithubIcon} size="sm" />
              <span>itshimelz/DiaryNote</span>
              <Icon icon={LinkSquare02Icon} size="xs" />
            </a>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              License & Author
            </span>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              MIT &copy; itshimelz
            </span>
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <div className="w-full flex items-center justify-between">
          <a
            href={`${REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:underline"
          >
            <Icon icon={Globe02Icon} size="xs" />
            <span>Releases</span>
          </a>

          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};
