import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchActionBar } from '../BatchActionBar';
import { useNotesStore } from '../../stores/notesStore';
import { Note } from '../../types';

const textNote1: Note = {
  id: 'n1',
  title: 'Note 1',
  content: 'Text content 1',
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

const textNote2: Note = {
  ...textNote1,
  id: 'n2',
  title: 'Note 2',
  content: 'Text content 2',
  x: 100,
  y: 100,
};

const imageNote: Note = {
  ...textNote1,
  id: 'img1',
  title: 'Photo Note',
  content: 'Caption',
  imageUrl: 'data:image/png;base64,sample',
  x: 200,
  y: 200,
};

describe('BatchActionBar component', () => {
  it('renders AI Merge button for 2 text notes when AI services are enabled', () => {
    const onMergeNotesAI = vi.fn();

    useNotesStore.setState((prev) => {
        const byId = { ...prev.notesById };
        [textNote1, textNote2, imageNote].forEach((n) => (byId[n.id] = n as any));
        return { notesById: byId, order: Object.keys(byId) };
      });
      render(
      <BatchActionBar
        selectedNoteIds={['n1', 'n2']}
        enableAIServices={true}
        onMergeNotesAI={onMergeNotesAI}
        onUpdateBatchNotes={vi.fn()}
        onDeleteNotes={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    const mergeBtn = screen.getByRole('button', { name: /merge/i });
    expect(mergeBtn).toBeTruthy();
    expect(mergeBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(mergeBtn);
    expect(onMergeNotesAI).toHaveBeenCalled();
  });

  it('hides and disables AI Merge button when selection includes an image note', () => {
    const onMergeNotesAI = vi.fn();

    useNotesStore.setState((prev) => {
        const byId = { ...prev.notesById };
        [textNote1, textNote2, imageNote].forEach((n) => (byId[n.id] = n as any));
        return { notesById: byId, order: Object.keys(byId) };
      });
      render(
      <BatchActionBar
        selectedNoteIds={['n1', 'img1']}
        enableAIServices={true}
        onMergeNotesAI={onMergeNotesAI}
        onUpdateBatchNotes={vi.fn()}
        onDeleteNotes={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    // Merge button must not be rendered when an image note is in selection
    expect(screen.queryByRole('button', { name: /merge/i })).toBeNull();
  });

  it('handles deselecting all notes', () => {
    const onClearSelection = vi.fn();

    useNotesStore.setState((prev) => {
        const byId = { ...prev.notesById };
        [textNote1, textNote2, imageNote].forEach((n) => (byId[n.id] = n as any));
        return { notesById: byId, order: Object.keys(byId) };
      });
      render(
      <BatchActionBar
        selectedNoteIds={['n1', 'n2']}
        onUpdateBatchNotes={vi.fn()}
        onDeleteNotes={vi.fn()}
        onClearSelection={onClearSelection}
      />
    );

    const deselectBtn = screen.getByLabelText('Clear selection');
    fireEvent.click(deselectBtn);
    expect(onClearSelection).toHaveBeenCalled();
  });
});
