import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NoteCover } from '../NoteCard/NoteCover';
import { Note } from '../../types';

describe('NoteCover Component', () => {
  const mockNote: Note = {
    id: 'note-cover-1',
    x: 100,
    y: 100,
    width: 320,
    height: 260,
    zIndex: 1,
    title: 'Secret Diary Entry',
    content: 'This is private confidential content.',
    fontSize: 'md',
    fontFamily: 'caveat',
    paperTheme: 'kraft',
    isCovered: true,
    coverStyle: 'classic-kraft',
    sealStyle: 'wax-seal-crest',
    coverPrompt: 'Tap to read secret',
    tags: ['personal', 'diary'],
    createdAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z',
  };

  it('renders title, custom prompt, and tags correctly', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    expect(screen.getByText('Secret Diary Entry')).toBeDefined();
    expect(screen.getByText('Tap to read secret')).toBeDefined();
    expect(screen.getByText('#personal')).toBeDefined();
    expect(screen.getByText('#diary')).toBeDefined();
  });

  it('triggers onReveal on click', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    const coverElement = screen.getByRole('button');
    fireEvent.click(coverElement);

    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('triggers onReveal on Enter keypress', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    const coverElement = screen.getByRole('button');
    fireEvent.keyDown(coverElement, { key: 'Enter' });

    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('renders default fallback title when title is empty', () => {
    const onReveal = vi.fn();
    const emptyTitleNote: Note = {
      ...mockNote,
      title: '',
      coverPrompt: undefined,
    };
    render(<NoteCover note={emptyTitleNote} onReveal={onReveal} />);

    expect(screen.getByText('Untitled Note')).toBeDefined();
    expect(screen.getByText('Click to open')).toBeDefined();
  });

  it('does NOT trigger onReveal on Alt+Click', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    const coverElement = screen.getByRole('button');
    fireEvent.click(coverElement, { altKey: true });

    expect(onReveal).not.toHaveBeenCalled();
  });

  it('prevents default and stops propagation on context menu', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    const coverElement = screen.getByRole('button');
    const contextMenuEvent = fireEvent.contextMenu(coverElement);

    // Context menu event was cancelled
    expect(contextMenuEvent).toBe(false);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('does NOT trigger onReveal when note is being dragged', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} isDragging={true} />);

    const coverElement = screen.getByRole('button');
    fireEvent.click(coverElement);

    expect(onReveal).not.toHaveBeenCalled();
  });

  it('does NOT trigger onReveal when pointer moved during drag gesture', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    const coverElement = screen.getByRole('button');
    fireEvent.pointerDown(coverElement, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.click(coverElement, { clientX: 150, clientY: 120 });

    expect(onReveal).not.toHaveBeenCalled();
  });

  it('triggers onReveal and stops propagation on double click', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    const coverElement = screen.getByRole('button');
    fireEvent.doubleClick(coverElement);

    expect(onReveal).toHaveBeenCalled();
  });
});
