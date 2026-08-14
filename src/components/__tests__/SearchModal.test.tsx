import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SearchModal } from '../Modals/SearchModal';
import { Note } from '../../types';

const mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Alpha Note',
    content: 'First note content with #project tag',
    x: 0,
    y: 0,
    width: 340,
    height: 340,
    createdAt: new Date('2026-08-14T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-14T10:00:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    tags: ['project'],
    zIndex: 1,
  },
  {
    id: 'note-2',
    title: 'Beta Note',
    content: 'Second note description',
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

describe('SearchModal UI Component', () => {
  it('renders search input and notes with primitives', () => {
    const handleClose = vi.fn();
    const handleSelectNote = vi.fn();

    render(
      <SearchModal
        isOpen={true}
        onClose={handleClose}
        notes={mockNotes}
        onSelectNote={handleSelectNote}
      />
    );

    expect(screen.getByPlaceholderText('Search notes, dates, tags (#journal)...')).toBeDefined();
    expect(screen.getByText('Alpha Note')).toBeDefined();
    expect(screen.getByText('Beta Note')).toBeDefined();
  });

  it('filters notes when query is typed', () => {
    render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        notes={mockNotes}
        onSelectNote={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('Search notes, dates, tags (#journal)...');
    fireEvent.change(input, { target: { value: 'Alpha' } });

    expect(screen.getByText(/Alpha/i)).toBeDefined();
    expect(screen.queryByText(/Beta Note/i)).toBeNull();
  });

  it('selects note and closes modal when note is clicked', () => {
    const handleClose = vi.fn();
    const handleSelectNote = vi.fn();

    render(
      <SearchModal
        isOpen={true}
        onClose={handleClose}
        notes={mockNotes}
        onSelectNote={handleSelectNote}
      />
    );

    const alphaItem = screen.getByText('Alpha Note');
    fireEvent.click(alphaItem);

    expect(handleSelectNote).toHaveBeenCalledWith('note-1');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
