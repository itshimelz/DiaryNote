import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmationModal } from '../Modals/DeleteConfirmationModal';

describe('DeleteConfirmationModal component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    count: 1,
    noteTitles: ['Design Systems and Specs'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders single note deletion confirmation with title preview', () => {
    render(<DeleteConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Confirm Deletion')).toBeTruthy();
    expect(screen.getByText('Delete Note?')).toBeTruthy();
    expect(screen.getByText('Design Systems and Specs')).toBeTruthy();
    expect(screen.getByText('This note will be permanently removed from your canvas.')).toBeTruthy();
  });

  it('renders multi-note deletion confirmation with count and badges', () => {
    render(
      <DeleteConfirmationModal
        {...defaultProps}
        count={3}
        noteTitles={['Note 1', 'Note 2', 'Note 3']}
      />
    );

    expect(screen.getByText('Delete 3 Selected Notes?')).toBeTruthy();
    expect(screen.getByText('Note 1')).toBeTruthy();
    expect(screen.getByText('Note 2')).toBeTruthy();
    expect(screen.getByText('Note 3')).toBeTruthy();
  });

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteConfirmationModal {...defaultProps} onClose={onClose} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Enter key is pressed', () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<DeleteConfirmationModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });
});
