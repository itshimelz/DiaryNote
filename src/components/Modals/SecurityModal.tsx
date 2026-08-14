import React, { useState } from 'react';
import {
  SecurityLockIcon,
  Key01Icon,
  Alert02Icon,
  CircleQuestionMarkIcon,
  CircleUnlock01Icon,
} from '@hugeicons/core-free-icons';
import { hashSecurityInput, verifySecurityInput } from '../../utils';
import { CanvasTheme } from '../../types';
import { cacheSessionPasscode } from '../../services/cryptoVaultService';
import { setMasterSessionUnlocked } from '../../services/authPolicyService';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input, Icon } from '../ui';

export type SecurityModalMode = 'set' | 'unlock';

interface SecurityModalProps {
  isOpen: boolean;
  mode: SecurityModalMode;
  themeMode?: CanvasTheme;
  existingQuestion?: string;
  existingPasswordHash?: string;
  existingAnswerHash?: string;
  onClose: () => void;
  onSuccessSet: (passwordHash: string, question: string, answerHash: string) => void;
  onSuccessUnlock: () => void;
}

const DEFAULT_QUESTIONS = [
  'What is your secret master passphrase?',
  'What is the name of your first pet?',
  'What city were you born in?',
  'What was your childhood nickname?',
];

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  mode,
  themeMode: _themeMode,
  existingQuestion = DEFAULT_QUESTIONS[0],
  existingPasswordHash = '',
  existingAnswerHash = '',
  onClose,
  onSuccessSet,
  onSuccessUnlock,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(existingQuestion);
  const [customQuestion, setCustomQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');

  const [isForgotView, setIsForgotView] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    const finalQuestion = selectedQuestion === 'custom' ? customQuestion : selectedQuestion;
    if (!finalQuestion.trim()) {
      setErrorMessage('Please provide a security recovery question.');
      return;
    }
    if (!recoveryAnswer.trim()) {
      setErrorMessage('Please provide a security recovery answer.');
      return;
    }

    try {
      const passHash = await hashSecurityInput(password);
      const ansHash = await hashSecurityInput(recoveryAnswer);
      cacheSessionPasscode(password);
      setMasterSessionUnlocked(true);

      onSuccessSet(passHash, finalQuestion, ansHash);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to set security passcode.');
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const isValid = await verifySecurityInput(password, existingPasswordHash);
      if (isValid) {
        cacheSessionPasscode(password);
        setMasterSessionUnlocked(true);
        onSuccessUnlock();
        onClose();
      } else {
        setErrorMessage('Incorrect password. Please try again or use recovery.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification rate limit in effect. Please wait.');
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const isValid = await verifySecurityInput(recoveryAnswer, existingAnswerHash);
      if (isValid) {
        setMasterSessionUnlocked(true);
        onSuccessUnlock();
        onClose();
      } else {
        setErrorMessage('Incorrect recovery answer. Please double-check spelling.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification rate limit in effect. Please wait.');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={mode === 'set' ? SecurityLockIcon : Key01Icon} size="md" />
            <span>
              {mode === 'set'
                ? 'Set Note Passcode'
                : isForgotView
                ? 'Password Recovery'
                : 'Unlock Note Access'}
            </span>
          </span>
        }
        onClose={onClose}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-2.5 rounded-sm flex items-start gap-2 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
          <Icon icon={Alert02Icon} size="sm" className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MODE 1: SET PASSWORD */}
      {mode === 'set' && (
        <form onSubmit={handleSetLock} className="flex flex-col gap-4">
          <DialogBody className="space-y-3 text-xs">
            {/* Security Warning */}
            <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
              <Icon icon={Alert02Icon} size="sm" className="shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-semibold text-[11px] uppercase tracking-wider mb-0.5 text-slate-900 dark:text-slate-200">
                  Client-Side Security
                </p>
                <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
                  Passcodes are hashed locally. Fill out the recovery question to prevent permanent
                  loss if you forget your password.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Set Passcode
              </label>
              <Input
                type="password"
                required
                isPasswordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode (min 4 chars)"
                className="font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Confirm Passcode
              </label>
              <Input
                type="password"
                required
                isPasswordToggle
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter passcode"
                className="font-mono"
              />
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800">
              <label className="block font-semibold mb-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Icon icon={CircleQuestionMarkIcon} size="xs" />
                <span>Security Recovery Question</span>
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-sans transition-colors mb-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus:border-slate-500"
              >
                {DEFAULT_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
                <option value="custom">Custom Question...</option>
              </select>

              {selectedQuestion === 'custom' && (
                <div className="mb-2">
                  <Input
                    type="text"
                    required
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Type your custom security question"
                  />
                </div>
              )}

              <Input
                type="text"
                required
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Secret Recovery Answer"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Set Passcode
            </Button>
          </DialogFooter>
        </form>
      )}

      {/* MODE 2: UNLOCK NOTE */}
      {mode === 'unlock' && !isForgotView && (
        <form onSubmit={handleVerifyPassword} className="flex flex-col gap-4">
          <DialogBody className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Enter Note Passcode
              </label>
              <Input
                type="password"
                required
                autoFocus
                isPasswordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode"
                className="font-mono text-sm"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsForgotView(true)}
                className="text-[11px] underline underline-offset-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Forgot Passcode?
              </button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  icon={CircleUnlock01Icon}
                >
                  Unlock
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      )}

      {/* MODE 3: FORGOT PASSWORD RECOVERY */}
      {mode === 'unlock' && isForgotView && (
        <form onSubmit={handleVerifyRecovery} className="flex flex-col gap-4">
          <DialogBody className="space-y-3.5 text-xs">
            <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="block text-[10px] uppercase font-mono tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                Security Question:
              </span>
              <p className="font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                "{existingQuestion}"
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Your Recovery Answer
              </label>
              <Input
                type="text"
                required
                autoFocus
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Type your recovery answer"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsForgotView(false)}
                className="text-[11px] underline underline-offset-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Back to Password
              </button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  icon={CircleUnlock01Icon}
                >
                  Recover & Unlock
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
};
