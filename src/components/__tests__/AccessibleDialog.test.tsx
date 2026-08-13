import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AccessibleDialog } from '../Common/AccessibleDialog';

describe('AccessibleDialog primitive', () => {
  it('renders modal dialog when isOpen is true', () => {
    const handleClose = vi.fn();
    render(
      <AccessibleDialog
        isOpen={true}
        onClose={handleClose}
        title="Settings Dialog"
        description="Configure your preferences"
      >
        <div>Modal Content</div>
      </AccessibleDialog>
    );

    expect(screen.getByText('Settings Dialog')).toBeDefined();
    expect(screen.getByText('Configure your preferences')).toBeDefined();
    expect(screen.getByText('Modal Content')).toBeDefined();
  });

  it('does not render content when isOpen is false', () => {
    render(
      <AccessibleDialog
        isOpen={false}
        onClose={() => {}}
        title="Settings Dialog"
      >
        <div>Hidden Content</div>
      </AccessibleDialog>
    );

    expect(screen.queryByText('Settings Dialog')).toBeNull();
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <AccessibleDialog
        isOpen={true}
        onClose={handleClose}
        title="Settings Dialog"
      >
        <div>Modal Content</div>
      </AccessibleDialog>
    );

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
