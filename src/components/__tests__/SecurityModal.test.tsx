import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SecurityModal } from '../Modals/SecurityModal';

describe('SecurityModal UI Component', () => {
  const onSuccessSet = vi.fn();
  const onSuccessUnlock = vi.fn();
  const onSuccessRemove = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Set Passcode mode with form inputs', () => {
    render(
      <SecurityModal
        isOpen={true}
        mode="set"
        onClose={onClose}
        onSuccessSet={onSuccessSet}
        onSuccessUnlock={onSuccessUnlock}
      />
    );

    expect(screen.getByText('Set Master Passcode')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter passcode (min 4 chars)')).toBeDefined();
    expect(screen.getByPlaceholderText('Re-enter passcode')).toBeDefined();
    expect(screen.getByPlaceholderText('Secret Recovery Answer')).toBeDefined();
  });

  it('renders Unlock Note mode with password input and forgot password option', () => {
    render(
      <SecurityModal
        isOpen={true}
        mode="unlock"
        existingPasswordHash="hashed_1234"
        onClose={onClose}
        onSuccessSet={onSuccessSet}
        onSuccessUnlock={onSuccessUnlock}
      />
    );

    expect(screen.getByText('Unlock Note Access')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter passcode')).toBeDefined();
    expect(screen.getByText('Forgot Passcode?')).toBeDefined();
  });

  it('renders Change Passcode mode with current and new passcode fields', () => {
    render(
      <SecurityModal
        isOpen={true}
        mode="change"
        existingPasswordHash="hashed_1234"
        onClose={onClose}
        onSuccessSet={onSuccessSet}
        onSuccessUnlock={onSuccessUnlock}
      />
    );

    expect(screen.getByText('Change Master Passcode')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter current passcode')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter new passcode (min 4 chars)')).toBeDefined();
    expect(screen.getByPlaceholderText('Re-enter new passcode')).toBeDefined();
  });

  it('renders Reset Passcode mode with recovery question prompt', () => {
    render(
      <SecurityModal
        isOpen={true}
        mode="reset"
        existingQuestion="What is your secret passphrase?"
        existingAnswerHash="hashed_answer"
        onClose={onClose}
        onSuccessSet={onSuccessSet}
        onSuccessUnlock={onSuccessUnlock}
      />
    );

    expect(screen.getByText('Reset Passcode via Recovery')).toBeDefined();
    expect(screen.getByText('"What is your secret passphrase?"')).toBeDefined();
    expect(screen.getByPlaceholderText('Type your recovery answer')).toBeDefined();
  });

  it('renders Remove Passcode mode with warning', () => {
    render(
      <SecurityModal
        isOpen={true}
        mode="remove"
        existingPasswordHash="hashed_1234"
        onClose={onClose}
        onSuccessSet={onSuccessSet}
        onSuccessUnlock={onSuccessUnlock}
        onSuccessRemove={onSuccessRemove}
      />
    );

    expect(screen.getByText('Disable Master Passcode')).toBeDefined();
    expect(screen.getByText('Disable Passcode Protection')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter current passcode')).toBeDefined();
  });
});
