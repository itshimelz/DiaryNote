import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteCardLOD } from '../NoteCardLOD';
import { CanvasCard } from '../ConnectedCards';
import { Note } from '../../../types';
import { LOD_ZOOM_THRESHOLD } from '../../../constants/canvas';
import { useNotesStore } from '../../../stores/notesStore';

describe('Level-of-Detail (LOD) Note Rendering', () => {
  const baseNote: Note = {
    id: 'lod-note-1',
    title: 'Architecture Ideas',
    content: '1. Modular design\n2. Event-driven bus\n3. High-throughput queues',
    x: 150,
    y: 200,
    width: 320,
    height: 240,
    paperTheme: 'white',
    fontFamily: 'sans',
    fontSize: 'md',
    zIndex: 2,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  };

  beforeEach(() => {
    useNotesStore.setState({
      notesById: { [baseNote.id]: baseNote },
      layoutVersion: 1,
    });
  });

  it('renders NoteCardLOD with lightweight title and truncated preview', () => {
    const onSelectNote = vi.fn();
    const onNavigateToNote = vi.fn();

    render(
      <NoteCardLOD
        note={baseNote}
        allNotes={[baseNote]}
        zoom={0.2}
        isSelected={false}
        isFocused={false}
        onSelectNote={onSelectNote}
        onNavigateToNote={onNavigateToNote}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    expect(screen.getByText('Architecture Ideas')).toBeTruthy();
    expect(screen.getByText(/1\. Modular design/)).toBeTruthy();

    // Verify container has ID for spatial bounding
    const container = document.getElementById('note-card-lod-note-1');
    expect(container).toBeTruthy();
    expect(container?.style.transform).toBe('translate3d(150px, 200px, 0)');
    expect(container?.style.width).toBe('320px');
    expect(container?.style.height).toBe('240px');

    // Double click triggers navigation
    if (container) {
      fireEvent.doubleClick(container);
      expect(onNavigateToNote).toHaveBeenCalledWith('lod-note-1');
    }
  });

  it('renders pinned and locked indicators in LOD mode', () => {
    const lockedPinnedNote: Note = {
      ...baseNote,
      isPinned: true,
      isLocked: true,
    };

    render(
      <NoteCardLOD
        note={lockedPinnedNote}
        allNotes={[lockedPinnedNote]}
        zoom={0.25}
        isSelected={false}
        isFocused={false}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    expect(screen.getByText('Architecture Ideas')).toBeTruthy();
  });

  it('renders sealed cover preview for covered notes in LOD mode', () => {
    const coveredNote: Note = {
      ...baseNote,
      isCovered: true,
      title: 'Secret Journal',
    };

    render(
      <NoteCardLOD
        note={coveredNote}
        allNotes={[coveredNote]}
        zoom={0.25}
        isSelected={false}
        isFocused={false}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    expect(screen.getByText('Sealed')).toBeTruthy();
    expect(screen.getByText('Secret Journal')).toBeTruthy();
  });

  it('renders image thumbnail for image notes in LOD mode', () => {
    const imageNote: Note = {
      ...baseNote,
      imageUrl: 'diarynote-asset://sha256:abcd1234',
      title: 'Vacation Photo',
    };

    render(
      <NoteCardLOD
        note={imageNote}
        allNotes={[imageNote]}
        zoom={0.25}
        isSelected={false}
        isFocused={false}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(screen.getByText('Vacation Photo')).toBeTruthy();
  });

  it('CanvasCard automatically selects LOD component when zoom is below threshold and unselected', () => {
    render(
      <CanvasCard
        noteId={baseNote.id}
        zoom={LOD_ZOOM_THRESHOLD - 0.05} // Below threshold -> LOD
        isSelected={false}
        isFocused={false}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    // In LOD mode, no toolbar exists
    expect(screen.queryByTitle('Delete note')).toBeNull();
    expect(screen.getByText('Architecture Ideas')).toBeTruthy();
  });

  it('CanvasCard renders full interactive card when zoom >= threshold or selected', () => {
    const { rerender } = render(
      <CanvasCard
        noteId={baseNote.id}
        zoom={1.0} // High zoom -> full interactive card
        isSelected={false}
        isFocused={false}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    // Full card has bottom toolbar with actions
    expect(screen.getByTitle('Delete note')).toBeTruthy();

    // Rerender at low zoom but selected -> keeps full interactive card
    rerender(
      <CanvasCard
        noteId={baseNote.id}
        zoom={0.2}
        isSelected={true}
        isFocused={false}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    expect(screen.getByTitle('Delete note')).toBeTruthy();
  });
});
