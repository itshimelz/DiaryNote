import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageNoteCard } from '../ImageNoteCard';
import { Note } from '../../../types';

const mockImageNote: Note = {
  id: 'img-note-1',
  title: 'Tokyo Sunset',
  content: 'Sunset over Shibuya',
  x: 100,
  y: 100,
  width: 320,
  height: 380,
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
  fontFamily: 'caveat',
  fontSize: 'md',
  paperTheme: 'white',
  imageUrl: 'data:image/png;base64,test-image-data',
  imageType: 'image/png',
  imageAspectRatio: 1.33,
  frameStyle: 'polaroid',
  pinStyle: 'pushpin-red',
  rotation: 1.5,
  zIndex: 1,
};

describe('ImageNoteCard component', () => {
  it('renders polaroid photo card with caption and pushpin decoration', () => {
    const onSelectNote = vi.fn();
    const onUpdateNote = vi.fn();
    const onDeleteNote = vi.fn();

    const { container } = render(
      <ImageNoteCard
        note={mockImageNote}
        onSelectNote={onSelectNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />
    );

    expect(screen.getByText('Sunset over Shibuya')).toBeTruthy();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,test-image-data');
    expect(container.querySelector('.polaroid-frame')).toBeTruthy();
    expect(container.querySelector('[title="Pinned"]')).toBeTruthy();
  });

  it('renders photo print frame style without polaroid frame class', () => {
    const photoNote: Note = {
      ...mockImageNote,
      frameStyle: 'photo',
    };

    const { container } = render(
      <ImageNoteCard
        note={photoNote}
        onSelectNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    expect(container.querySelector('.photo-frame')).toBeTruthy();
    expect(container.querySelector('.polaroid-frame')).toBeNull();
  });

  it('has zero hover scaling on images for flat, stable display', () => {
    const { container } = render(
      <ImageNoteCard
        note={mockImageNote}
        onSelectNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    const img = container.querySelector('img');
    expect(img?.className).not.toContain('hover:scale');
    expect(img?.className).not.toContain('group-hover/image:scale');
  });

  it('triggers delete callback when delete button is clicked', () => {
    const onDeleteNote = vi.fn();

    render(
      <ImageNoteCard
        note={mockImageNote}
        isSelected={true}
        onSelectNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={onDeleteNote}
      />
    );

    const deleteBtn = screen.getByTitle('Delete Card');
    fireEvent.click(deleteBtn);
    expect(onDeleteNote).toHaveBeenCalledWith('img-note-1');
  });

  it('renders protected lock screen when isLocked is true and handles unlock', () => {
    const onRequestUnlockNote = vi.fn();
    const lockedNote: Note = {
      ...mockImageNote,
      isLocked: true,
    };

    const { container } = render(
      <ImageNoteCard
        note={lockedNote}
        isSelected={true}
        onSelectNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onRequestUnlockNote={onRequestUnlockNote}
      />
    );

    expect(screen.getByText('Protected Photo')).toBeTruthy();
    expect(screen.getByText(/This photo card is locked with passcode protection/i)).toBeTruthy();
    expect(screen.getByText('Unlock Photo')).toBeTruthy();

    // The image and caption should NOT be displayed when locked
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('Sunset over Shibuya')).toBeNull();

    // Clicking "Unlock Photo" triggers callback
    fireEvent.click(screen.getByText('Unlock Photo'));
    expect(onRequestUnlockNote).toHaveBeenCalledWith('img-note-1');
  });

  it('handles locking request from top quick action button', () => {
    const onRequestLockNote = vi.fn();

    render(
      <ImageNoteCard
        note={mockImageNote}
        isSelected={true}
        onSelectNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onRequestLockNote={onRequestLockNote}
      />
    );

    const lockBtn = screen.getByTitle('Lock Photo Access');
    fireEvent.click(lockBtn);
    expect(onRequestLockNote).toHaveBeenCalledWith('img-note-1');
  });
});
