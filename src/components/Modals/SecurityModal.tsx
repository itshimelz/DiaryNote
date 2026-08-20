import React, { useState, useEffect } from 'react';
import {
  SecurityLockIcon,
  Key01Icon,
  Alert02Icon,
  CircleQuestionMarkIcon,
  CircleUnlock01Icon,
  Delete02Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { hashSecurityInput, verifySecurityInput, sendNativeAppNotification } from '../../utils';
import { CanvasTheme } from '../../types';
import { cacheSessionPasscode } from '../../services/cryptoVaultService';
import { setMasterSessionUnlocked } from '../../services/authPolicyService';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input, Icon, Select } from '../ui';

export type SecurityModalMode = 'set' | 'unlock' | 'change' | 'reset' | 'update_recovery' | 'remove';

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
  onSuccessRemove?: () => void;
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
  onSuccessRemove,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(existingQuestion || DEFAULT_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');

  const [isForgotView, setIsForgotView] = useState(false);
  const [isRecoveryVerified, setIsRecoveryVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset internal fields when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setSelectedQuestion(existingQuestion || DEFAULT_QUESTIONS[0]);
      setCustomQuestion('');
      setRecoveryAnswer('');
      setIsForgotView(false);
      setIsRecoveryVerified(false);
      setErrorMessage(null);
    }
  }, [isOpen, mode, existingQuestion]);

  if (!isOpen) return null;

  // MODE 1: SET INITIAL PASSCODE
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
      sendNativeAppNotification('Security Passcode Enabled', 'Master password and recovery question saved.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to set security passcode.');
    }
  };

  // MODE 2: CHANGE PASSCODE
  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current passcode.');
      return;
    }

    try {
      const isCurrentValid = await verifySecurityInput(currentPassword, existingPasswordHash);
      if (!isCurrentValid) {
        setErrorMessage('Current passcode is incorrect.');
        return;
      }

      if (password.length < 4) {
        setErrorMessage('New passcode must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('New passcodes do not match.');
        return;
      }

      const newPassHash = await hashSecurityInput(password);
      cacheSessionPasscode(password);
      setMasterSessionUnlocked(true);

      onSuccessSet(newPassHash, existingQuestion, existingAnswerHash);
      sendNativeAppNotification('Passcode Changed', 'Master passcode has been successfully updated.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to change passcode.');
    }
  };

  // MODE 3: RESET PASSCODE (STEP 1: RECOVERY VERIFICATION)
  const handleVerifyResetRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recoveryAnswer.trim()) {
      setErrorMessage('Please enter your recovery answer.');
      return;
    }

    try {
      const isValid = await verifySecurityInput(recoveryAnswer, existingAnswerHash);
      if (isValid) {
        setIsRecoveryVerified(true);
        setErrorMessage(null);
      } else {
        setErrorMessage('Incorrect recovery answer. Please double-check spelling.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification rate limit in effect. Please wait.');
    }
  };

  // MODE 3: RESET PASSCODE (STEP 2: SET NEW PASSWORD)
  const handleSaveResetPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 4) {
      setErrorMessage('New passcode must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      const newPassHash = await hashSecurityInput(password);
      cacheSessionPasscode(password);
      setMasterSessionUnlocked(true);

      onSuccessSet(newPassHash, existingQuestion, existingAnswerHash);
      sendNativeAppNotification('Passcode Reset Successful', 'Your master passcode has been reset.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset passcode.');
    }
  };

  // MODE 4: UPDATE RECOVERY QUESTION & ANSWER
  const handleUpdateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current passcode.');
      return;
    }

    try {
      const isCurrentValid = await verifySecurityInput(currentPassword, existingPasswordHash);
      if (!isCurrentValid) {
        setErrorMessage('Current passcode is incorrect.');
        return;
      }

      const finalQuestion = selectedQuestion === 'custom' ? customQuestion : selectedQuestion;
      if (!finalQuestion.trim()) {
        setErrorMessage('Please provide a recovery question.');
        return;
      }
      if (!recoveryAnswer.trim()) {
        setErrorMessage('Please provide a recovery answer.');
        return;
      }

      const newAnsHash = await hashSecurityInput(recoveryAnswer);
      onSuccessSet(existingPasswordHash, finalQuestion, newAnsHash);
      sendNativeAppNotification('Recovery Updated', 'Security recovery question and answer updated.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update recovery question.');
    }
  };

  // MODE 5: REMOVE / DISABLE PASSCODE
  const handleRemoveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current passcode.');
      return;
    }

    try {
      const isCurrentValid = await verifySecurityInput(currentPassword, existingPasswordHash);
      if (!isCurrentValid) {
        setErrorMessage('Current passcode is incorrect.');
        return;
      }

      setMasterSessionUnlocked(false);
      if (onSuccessRemove) {
        onSuccessRemove();
      } else {
        onSuccessSet('', '', '');
      }
      sendNativeAppNotification('Security Disabled', 'Master passcode protection has been removed.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove security passcode.');
    }
  };

  // MODE 6: UNLOCK NOTE OR SESSION
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const isValid = await verifySecurityInput(password, existingPasswordHash);
      if (isValid) {
        cacheSessionPasscode(password);
        setMasterSessionUnlocked(true);
        onSuccessUnlock();
        sendNativeAppNotification('Vault Unlocked', 'Notes unlocked for this session.');
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
        sendNativeAppNotification('Vault Unlocked', 'Notes unlocked with recovery answer.');
        onClose();
      } else {
        setErrorMessage('Incorrect recovery answer. Please double-check spelling.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification rate limit in effect. Please wait.');
    }
  };

  // Modal Title determination
  const getModalTitle = () => {
    switch (mode) {
      case 'set':
        return 'Set Master Passcode';
      case 'change':
        return 'Change Master Passcode';
      case 'reset':
        return isRecoveryVerified ? 'Create New Passcode' : 'Reset Passcode via Recovery';
      case 'update_recovery':
        return 'Update Recovery Question';
      case 'remove':
        return 'Disable Master Passcode';
      case 'unlock':
      default:
        return isForgotView ? 'Password Recovery' : 'Unlock Note Access';
    }
  };

  const getModalIcon = () => {
    switch (mode) {
      case 'set':
      case 'remove':
        return SecurityLockIcon;
      case 'change':
        return Key01Icon;
      case 'reset':
      case 'update_recovery':
        return CircleQuestionMarkIcon;
      case 'unlock':
      default:
        return isForgotView ? CircleQuestionMarkIcon : Key01Icon;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={getModalIcon()} size="md" />
            <span>{getModalTitle()}</span>
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

      {/* MODE 1: SET INITIAL PASSWORD */}
      {mode === 'set' && (
        <form onSubmit={handleSetLock} className="flex flex-col gap-4">
          <DialogBody className="space-y-3 text-xs">
            <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
              <Icon icon={Alert02Icon} size="sm" className="shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-semibold text-[11px] uppercase tracking-wider mb-0.5 text-slate-900 dark:text-slate-200">
                  Client-Side Zero-Knowledge Security
                </p>
                <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
                  Passcodes are hashed locally. Fill out the recovery question to prevent permanent
                  data loss if you forget your password.
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

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Select
                label="Security Recovery Question"
                icon={CircleQuestionMarkIcon}
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                options={[
                  ...DEFAULT_QUESTIONS.map((q) => ({ value: q, label: q })),
                  { value: 'custom', label: 'Custom Question...' },
                ]}
              />

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

      {/* MODE 2: CHANGE PASSCODE */}
      {mode === 'change' && (
        <form onSubmit={handleChangePasscode} className="flex flex-col gap-4">
          <DialogBody className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Current Passcode
              </label>
              <Input
                type="password"
                required
                autoFocus
                isPasswordToggle
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current passcode"
                className="font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  New Passcode
                </label>
                <Input
                  type="password"
                  required
                  isPasswordToggle
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new passcode (min 4 chars)"
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  Confirm New Passcode
                </label>
                <Input
                  type="password"
                  required
                  isPasswordToggle
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new passcode"
                  className="font-mono"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={CheckmarkCircle02Icon}>
              Update Passcode
            </Button>
          </DialogFooter>
        </form>
      )}

      {/* MODE 3: RESET PASSCODE (STEP 1: QUESTION -> STEP 2: NEW PASSCODE) */}
      {mode === 'reset' && (
        <>
          {!isRecoveryVerified ? (
            <form onSubmit={handleVerifyResetRecovery} className="flex flex-col gap-4">
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
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Verify Answer
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleSaveResetPasscode} className="flex flex-col gap-4">
              <DialogBody className="space-y-3 text-xs">
                <div className="p-2.5 rounded-sm border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Icon icon={CheckmarkCircle02Icon} size="sm" className="shrink-0 text-emerald-600" />
                  <span>Recovery verified! Please choose a new master passcode.</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    New Passcode
                  </label>
                  <Input
                    type="password"
                    required
                    autoFocus
                    isPasswordToggle
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new passcode (min 4 chars)"
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    Confirm New Passcode
                  </label>
                  <Input
                    type="password"
                    required
                    isPasswordToggle
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new passcode"
                    className="font-mono"
                  />
                </div>
              </DialogBody>

              <DialogFooter>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" icon={CheckmarkCircle02Icon}>
                  Set New Passcode
                </Button>
              </DialogFooter>
            </form>
          )}
        </>
      )}

      {/* MODE 4: UPDATE RECOVERY QUESTION */}
      {mode === 'update_recovery' && (
        <form onSubmit={handleUpdateRecovery} className="flex flex-col gap-4">
          <DialogBody className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Current Passcode
              </label>
              <Input
                type="password"
                required
                autoFocus
                isPasswordToggle
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current passcode"
                className="font-mono"
              />
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Select
                label="New Security Question"
                icon={CircleQuestionMarkIcon}
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                options={[
                  ...DEFAULT_QUESTIONS.map((q) => ({ value: q, label: q })),
                  { value: 'custom', label: 'Custom Question...' },
                ]}
              />

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

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  New Recovery Answer
                </label>
                <Input
                  type="text"
                  required
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  placeholder="Type new recovery answer"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={CheckmarkCircle02Icon}>
              Save Recovery Info
            </Button>
          </DialogFooter>
        </form>
      )}

      {/* MODE 5: DISABLE / REMOVE PASSCODE */}
      {mode === 'remove' && (
        <form onSubmit={handleRemoveSecurity} className="flex flex-col gap-4">
          <DialogBody className="space-y-3 text-xs">
            <div className="p-3 rounded-sm border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <Icon icon={Alert02Icon} size="sm" className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold text-[11px] uppercase tracking-wider mb-0.5">
                  Disable Passcode Protection
                </p>
                <p className="leading-relaxed text-[11px]">
                  This will completely remove master password protection from DiaryNote and unlock all notes.
                  Please enter your passcode to confirm.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                Confirm Current Passcode
              </label>
              <Input
                type="password"
                required
                autoFocus
                isPasswordToggle
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current passcode"
                className="font-mono"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" icon={Delete02Icon}>
              Disable & Remove
            </Button>
          </DialogFooter>
        </form>
      )}

      {/* MODE 6: UNLOCK NOTE OR SESSION */}
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

      {/* MODE 6: FORGOT PASSWORD RECOVERY (IN UNLOCK MODE) */}
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
