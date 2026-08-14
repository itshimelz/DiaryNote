import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../Dialog';
import { Button } from '../Button';

describe('Dialog Primitive', () => {
  it('renders modal content when open', () => {
    const handleClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={handleClose}>
        <DialogHeader title="Test Dialog" description="Description goes here" onClose={handleClose} />
        <DialogBody>Modal content here</DialogBody>
        <DialogFooter>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogFooter>
      </Dialog>
    );

    expect(screen.getByText('Test Dialog')).toBeDefined();
    expect(screen.getByText('Description goes here')).toBeDefined();
    expect(screen.getByText('Modal content here')).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    render(
      <Dialog isOpen={false} onClose={() => {}}>
        <DialogHeader title="Hidden Dialog" />
      </Dialog>
    );
    expect(screen.queryByText('Hidden Dialog')).toBeNull();
  });
});
