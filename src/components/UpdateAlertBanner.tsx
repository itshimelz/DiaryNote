import React from 'react';
import {
  SparklesIcon,
  LinkSquare02Icon,
  Cancel01Icon,
  InformationCircleIcon,
  BookOpen01Icon,
} from '@hugeicons/core-free-icons';
import { Button, IconButton, Badge, Icon } from './ui';
import { ReleaseInfo, dismissUpdateAlert, CURRENT_VERSION } from '../utils/updateChecker';
import { CanvasTheme } from '../types';

interface UpdateAlertBannerProps {
  release: ReleaseInfo;
  themeMode?: CanvasTheme;
  onDismiss: () => void;
  onOpenAbout?: () => void;
}

export const UpdateAlertBanner: React.FC<UpdateAlertBannerProps> = ({
  release,
  themeMode = 'dark',
  onDismiss,
  onOpenAbout,
}) => {
  const isDark = themeMode !== 'light';

  const handleDismiss = () => {
    dismissUpdateAlert(release.version);
    onDismiss();
  };

  const handleViewRelease = () => {
    window.open(release.htmlUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[99999] max-w-sm w-full animate-in slide-in-from-top-4 duration-200 rounded-sm shadow-sm border p-4 overflow-hidden transition-opacity select-none font-sans ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
      role="alert"
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-2.5 mb-3 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon icon={SparklesIcon} size="md" className="text-amber-500 animate-pulse" />
          <h4 className="font-bold text-sm tracking-tight">New Update Available</h4>
        </div>

        <IconButton
          size="xs"
          variant="ghost"
          icon={Cancel01Icon}
          aria-label="Dismiss alert"
          onClick={handleDismiss}
        />
      </div>

      {/* Content Body - Styled Identically to AboutModal Cards */}
      <div className="space-y-2.5 text-xs">
        {/* App Title & Version Badge Box */}
        <div
          className={`p-2.5 rounded-sm border transition-colors ${
            isDark
              ? 'bg-slate-800/60 border-slate-700/60'
              : 'bg-slate-50 border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-sm ${
                  isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-800'
                }`}
              >
                <Icon icon={BookOpen01Icon} size="xs" />
              </div>
              <div>
                <h5 className="font-bold text-xs leading-tight">DiaryNote</h5>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Update {release.tagName} is now ready
                </p>
              </div>
            </div>
            <Badge variant="info" size="xs">
              {release.tagName}
            </Badge>
          </div>
        </div>

        {/* Update Highlight Status Box */}
        <div
          className={`p-2.5 rounded-sm border flex items-start gap-2 animate-in fade-in transition-colors ${
            isDark
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <Icon icon={SparklesIcon} size="xs" className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[11px] leading-snug">
              Version {release.tagName} released on GitHub (installed v{CURRENT_VERSION})!
            </p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        className={`mt-3 pt-2.5 border-t flex items-center justify-between transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1">
          {onOpenAbout && (
            <Button
              size="xs"
              variant="ghost"
              icon={InformationCircleIcon}
              onClick={onOpenAbout}
            >
              About
            </Button>
          )}

          <Button
            size="xs"
            variant="ghost"
            onClick={handleDismiss}
          >
            Remind later
          </Button>
        </div>

        <Button
          size="xs"
          variant="primary"
          icon={LinkSquare02Icon}
          iconPosition="right"
          onClick={handleViewRelease}
        >
          View Release
        </Button>
      </div>
    </div>
  );
};
