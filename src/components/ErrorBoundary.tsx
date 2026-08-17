import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Alert02Icon,
  Download04Icon,
  RotateLeft01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { Button, Icon } from './ui';
import { initDatabase } from '../lib/rustStorage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExporting: boolean;
  exportSuccess: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExporting: false,
      exportSuccess: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isExporting: false,
      exportSuccess: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL: React ErrorBoundary caught an unhandled runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleEmergencyExport = async () => {
    try {
      this.setState({ isExporting: true });
      const { notes } = await initDatabase();
      const backupPayload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        notes,
        metadata: {
          emergencyExport: true,
          reason: this.state.error?.message || 'Unknown Crash',
        },
      };

      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `diarynote-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      this.setState({ exportSuccess: true, isExporting: false });
    } catch (err) {
      console.error('Failed to generate emergency backup:', err);
      this.setState({ isExporting: false });
      alert('Could not export backup directly from database: ' + String(err));
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleResetView = () => {
    try {
      localStorage.removeItem('diarynote_canvas_transform');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-slate-100 p-6 font-sans select-none">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-sm shadow-sm p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Icon icon={Alert02Icon} size="xl" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-100">Something went wrong</h1>
                <p className="text-xs text-slate-400">
                  DiaryNote encountered an unexpected error. Your notes in storage are safe.
                </p>
              </div>
            </div>

            {/* Error stack preview */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-sm p-3 text-[11px] font-mono text-rose-300 max-h-36 overflow-y-auto whitespace-pre-wrap break-all">
              {this.state.error?.toString() || 'Unknown Error'}
              {this.state.errorInfo?.componentStack && `\n${this.state.errorInfo.componentStack}`}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={Download04Icon}
                loading={this.state.isExporting}
                onClick={this.handleEmergencyExport}
              >
                {this.state.exportSuccess ? 'Backup Exported!' : 'Emergency Backup'}
              </Button>

              <Button
                variant="secondary"
                size="md"
                icon={RotateLeft01Icon}
                onClick={this.handleResetView}
              >
                Reset View
              </Button>

              <Button
                variant="ghost"
                size="md"
                icon={Loading03Icon}
                onClick={this.handleReload}
              >
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
