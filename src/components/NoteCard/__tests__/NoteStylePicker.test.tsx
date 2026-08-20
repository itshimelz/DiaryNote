import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteStylePicker } from '../NoteStylePicker';
import { Note } from '../../../types';

const textNote: Note = {
  id: 'note-1',
  title: 'Text Note',
  content: 'Some note text',
  x: 0,
  y: 0,
  width: 300,
  height: 200,
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
  fontFamily: 'sans',
  fontSize: 'md',
  paperTheme: 'white',
  pinStyle: 'none',
  zIndex: 1,
};

const imageNote: Note = {
  ...textNote,
  id: 'note-2',
  imageUrl: 'data:image/png;base64,sample',
  frameStyle: 'polaroid',
  rotation: 1.5,
};

describe('NoteStylePicker component', () => {
  it('renders only washi tape options and no tilt options for standard text notes', () => {
    const onUpdateNote = vi.fn();
    const onClose = vi.fn();

    render(
      <NoteStylePicker
        note={textNote}
        onUpdateNote={onUpdateNote}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Washi Tape Decoration')).toBeTruthy();
    expect(screen.getByTitle('Classic Teal')).toBeTruthy();
    expect(screen.getByTitle('Classic Pink')).toBeTruthy();
    expect(screen.getByTitle('Classic Beige')).toBeTruthy();
    expect(screen.getByTitle('Coral Hearts')).toBeTruthy();
    expect(screen.getByTitle('Pink Waves')).toBeTruthy();
    expect(screen.getByTitle('Peach Gingham')).toBeTruthy();
    expect(screen.getByTitle('Teal Waves')).toBeTruthy();
    expect(screen.getByTitle('Glossy Tan')).toBeTruthy();

    // Must NOT contain pushpins
    expect(screen.queryByTitle('Red Pin')).toBeNull();
    expect(screen.queryByTitle('Blue Pin')).toBeNull();

    // Must NOT contain tilt/rotation section
    expect(screen.queryByText(/Bulletin Tilt/i)).toBeNull();
    expect(screen.queryByText('Randomize')).toBeNull();
  });

  it('renders frame style, all pins/tapes, and tilt controls for image notes', () => {
    const onUpdateNote = vi.fn();
    const onClose = vi.fn();

    render(
      <NoteStylePicker
        note={imageNote}
        onUpdateNote={onUpdateNote}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Photo Style & Framing')).toBeTruthy();
    expect(screen.getByText('Photo Frame Style')).toBeTruthy();
    expect(screen.getByText('Polaroid')).toBeTruthy();
    expect(screen.getByText('Photo Print')).toBeTruthy();
    expect(screen.getByText('Frameless')).toBeTruthy();
    expect(screen.queryByText('Standard')).toBeNull();

    // Paper Theme should NOT be shown for image cards
    expect(screen.queryByText('Paper Theme')).toBeNull();

    expect(screen.getByText('Pin & Tape Decoration')).toBeTruthy();
    expect(screen.getByTitle('Red Pin')).toBeTruthy();
    expect(screen.getByTitle('Blue Pin')).toBeTruthy();
    expect(screen.getByTitle('Coral Hearts')).toBeTruthy();
    expect(screen.getByTitle('Teal Waves')).toBeTruthy();

    // Must contain tilt section and randomize
    expect(screen.getByText(/Bulletin Tilt/i)).toBeTruthy();
    expect(screen.getByText('Randomize')).toBeTruthy();

    // Clicking a pin option calls onUpdateNote
    fireEvent.click(screen.getByTitle('Red Pin'));
    expect(onUpdateNote).toHaveBeenCalledWith(
      expect.objectContaining({
        pinStyle: 'pushpin-red',
      })
    );
  });

  it('renders cover style & seal selection and allows customizing emblem without switch toggle', () => {
    const onUpdateNote = vi.fn();
    const onClose = vi.fn();

    render(
      <NoteStylePicker
        note={textNote}
        initialTab="cover"
        onUpdateNote={onUpdateNote}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Cover Style & Seal')).toBeTruthy();
    expect(screen.getByText('Alt+C')).toBeTruthy();
    expect(screen.getByText('Cover Style')).toBeTruthy();
    expect(screen.getByText('Seal SVG Emblem')).toBeTruthy();

    // Must NOT contain toggle switch
    expect(screen.queryByRole('switch')).toBeNull();

    // Clicking a seal emblem calls onUpdateNote
    const seals = screen.getAllByRole('button');
    const sunSealBtn = seals.find((b) => b.getAttribute('title')?.includes('Golden Sun'));
    if (sunSealBtn) {
      fireEvent.click(sunSealBtn);
      expect(onUpdateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          sealStyle: 'golden-sun',
        })
      );
    }
  });

  it('allows switching between segmented tabs seamlessly', () => {
    const onUpdateNote = vi.fn();
    const onClose = vi.fn();

    render(
      <NoteStylePicker
        note={textNote}
        onUpdateNote={onUpdateNote}
        onClose={onClose}
      />
    );

    // Initial tab is Paper & Style
    expect(screen.getByText('Washi Tape Decoration')).toBeTruthy();
    expect(screen.queryByText('Handwriting & Font Family')).toBeNull();

    // Switch to Typography tab
    fireEvent.click(screen.getByRole('button', { name: /typography/i }));
    expect(screen.getByText('Handwriting & Font Family')).toBeTruthy();
    expect(screen.getByText('Text Size')).toBeTruthy();
    expect(screen.queryByText('Washi Tape Decoration')).toBeNull();

    // Switch to Cover & Seal tab
    fireEvent.click(screen.getByRole('button', { name: /cover & seal/i }));
    expect(screen.getByText('Cover Style & Seal')).toBeTruthy();
    expect(screen.getByText('Seal SVG Emblem')).toBeTruthy();
    expect(screen.queryByText('Handwriting & Font Family')).toBeNull();
  });
});
