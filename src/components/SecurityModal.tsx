import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound, HelpCircle, X } from 'lucide-react';
import { hashSecurityInput, verifySecurityInput } from '../lib/security';
import { CanvasTheme } from '../types';

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
  themeMode = 'dark',
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

  const isDark = themeMode !== 'light';

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

    const passHash = await hashSecurityInput(password);
    const ansHash = await hashSecurityInput(recoveryAnswer);

    onSuccessSet(passHash, finalQuestion, ansHash);
    onClose();
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isValid = await verifySecurityInput(password, existingPasswordHash);
    if (isValid) {
      onSuccessUnlock();
      onClose();
    } else {
      setErrorMessage('Incorrect password. Please try again or use recovery.');
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isValid = await verifySecurityInput(recoveryAnswer, existingAnswerHash);
    if (isValid) {
      onSuccessUnlock();
      onClose();
    } else {
      setErrorMessage('Incorrect recovery answer. Please double-check spelling.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className={`w-full max-w-md rounded-md shadow-sm border p-6 transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-4 mb-5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {mode === 'set' ? (
              <Lock className={`w-5 h-5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`} />
            ) : (
              <KeyRound className={`w-5 h-5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`} />
            )}
            <h2 className="font-bold text-base tracking-tight">
              {mode === 'set' ? 'Lock Note Access' : isForgotView ? 'Password Recovery' : 'Unlock Note'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2.5 text-xs border ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MODE 1: SET PASSWORD */}
        {mode === 'set' && (
          <form onSubmit={handleSetLock} className="space-y-4 text-xs">
            {/* Monochromatic Security Warning */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isDark ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
              <div>
                <p className={`font-semibold text-[11px] uppercase tracking-wider mb-0.5 ${
                  isDark ? 'text-slate-200' : 'text-slate-900'
                }`}>
                  Security Warning
                </p>
                <p className={`leading-relaxed text-[11px] ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Passcodes are hashed locally. Fill out the recovery question below to prevent permanent loss if you forget your password.
                </p>
              </div>
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>Set Passcode</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode (min 4 chars)"
                className={`w-full px-3 py-2 rounded-lg border outline-none font-mono transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>Confirm Passcode</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter passcode"
                className={`w-full px-3 py-2 rounded-lg border outline-none font-mono transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>

            <div className={`pt-2 border-t ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <label className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>
                <HelpCircle className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                <span>Security Recovery Question</span>
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors mb-2 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {DEFAULT_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
                <option value="custom">Custom Question...</option>
              </select>

              {selectedQuestion === 'custom' && (
                <input
                  type="text"
                  required
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Type your custom security question"
                  className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors mb-2 ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              )}

              <input
                type="text"
                required
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Secret Recovery Answer"
                className={`w-full px-3 py-2 rounded-lg border outline-none font-medium transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow transition-all ${
                isDark
                  ? 'bg-white text-slate-900 hover:bg-slate-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Lock Note
            </button>
          </form>
        )}

        {/* MODE 2: UNLOCK NOTE */}
        {mode === 'unlock' && !isForgotView && (
          <form onSubmit={handleVerifyPassword} className="space-y-4 text-xs">
            <div>
              <label className={`block font-semibold mb-1 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>Enter Note Passcode</label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode"
                className={`w-full px-3 py-2.5 rounded-xl border outline-none font-mono text-sm transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsForgotView(true)}
                className={`text-[11px] underline underline-offset-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Forgot Password?
              </button>

              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow transition-all flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD RECOVERY */}
        {mode === 'unlock' && isForgotView && (
          <form onSubmit={handleVerifyRecovery} className="space-y-4 text-xs">
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`block text-[10px] uppercase font-mono tracking-wider mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Security Question:
              </span>
              <p className={`font-semibold leading-relaxed ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}>
                "{existingQuestion}"
              </p>
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>Your Recovery Answer</label>
              <input
                type="text"
                required
                autoFocus
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Type your recovery answer"
                className={`w-full px-3 py-2.5 rounded-xl border outline-none font-medium text-sm transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsForgotView(false)}
                className={`text-[11px] underline underline-offset-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Back to Password
              </button>

              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow transition-all flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Recover & Unlock</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
