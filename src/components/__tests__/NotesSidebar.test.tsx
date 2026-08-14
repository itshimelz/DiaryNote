import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NotesSidebar } from '../NotesSidebar';
import { Note } from '../../types';

const mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Project Roadmap',
    content: 'Deliver UI primitive standardization',
    x: 0,
    y: 0,
    width: 340,
    height: 340,
    createdAt: new Date('2026-08-14T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-14T10:00:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    zIndex: 1,
  },
  {
    id: 'note-2',
    title: 'Daily Meeting',
    content: '- [x] Review architecture',
    x: 100,
    y: 100,
    width: 340,
    height: 340,
    createdAt: new Date('2026-08-14T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-14T11:00:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'cream',
    zIndex: 2,
  },
];

describe('NotesSidebar UI Component', () => {
  it('renders notes list and header with primitive components', () => {
    const handleClose = vi.fn();
    const handleSelectNote = vi.fn();
    const handleAddNote = vi.fn();
    const handleDeleteNote = vi.fn();

    render(
      <NotesSidebar
        isOpen={true}
        onClose={handleClose}
        notes={mockNotes}
        onSelectNote={handleSelectNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />
    );

    expect(screen.getByText('All notes (2)')).toBeDefined();
    expect(screen.getByText('Project Roadmap')).toBeDefined();
    expect(screen.getByText('Daily Meeting')).toBeDefined();
  });

  it('filters notes based on search query input', () => {
    render(
      <NotesSidebar
        isOpen={true}
        onClose={() => {}}
        notes={mockNotes}
        onSelectNote={() => {}}
        onAddNote={() => {}}
        onDeleteNote={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(searchInput, { target: { value: 'Roadmap' } });

    expect(screen.getByPlaceholderText('Search notes...')).toBeDefined();
  });

  it('triggers onAddNote when clicking Add Note button', () => {
    const handleAddNote = vi.fn();
    const handleClose = vi.fn();

    render(
      <NotesSidebar
        isOpen={true}
        onClose={handleClose}
        notes={mockNotes}
        onSelectNote={() => {}}
        onAddNote={handleAddNote}
        onDeleteNote={() => {}}
      />
    );

    const addBtn = screen.getByRole('button', { name: /add note/i });
    fireEvent.click(addBtn);

    expect(handleAddNote).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
