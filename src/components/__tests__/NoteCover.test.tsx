import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NoteCover } from '../NoteCard/NoteCover';
import { NoteCoverDecorations } from '../NoteCard/NoteCoverDecorations';
import { NOTE_COVER_STYLES, SEAL_STYLES } from '../../constants/noteCovers';
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
    sealStyle: 'golden-sun',
    coverPrompt: 'Tap to read secret',
    tags: ['personal', 'diary'],
    createdAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z',
  };

  it('renders title and custom prompt correctly', () => {
    const onReveal = vi.fn();
    render(<NoteCover note={mockNote} onReveal={onReveal} />);

    expect(screen.getByText('Secret Diary Entry')).toBeDefined();
    expect(screen.getByText('Tap to read secret')).toBeDefined();
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

  it('renders vintage-airmail envelope cover with postal decorations', () => {
    const onReveal = vi.fn();
    const airmailNote: Note = {
      ...mockNote,
      coverStyle: 'vintage-airmail',
      sealStyle: 'air-mail-postmark',
      title: 'Airmail Letter to Paris',
    };
    render(<NoteCover note={airmailNote} onReveal={onReveal} />);

    expect(screen.getByText('Airmail Letter to Paris')).toBeDefined();
    expect(screen.getByText('2026-08-20')).toBeDefined();
  });

  it('renders vintage postage stamp seal styles correctly', () => {
    const onReveal = vi.fn();
    const eiffelNote: Note = {
      ...mockNote,
      coverStyle: 'vintage-airmail',
      sealStyle: 'eiffel-postage-stamp',
      title: 'Paris Travelogue',
    };
    render(<NoteCover note={eiffelNote} onReveal={onReveal} />);

    expect(screen.getByText('Paris Travelogue')).toBeDefined();
  });

  it('renders NoteCoverDecorations for vintage-airmail style cleanly', () => {
    const { container } = render(<NoteCoverDecorations coverStyle="vintage-airmail" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders null from NoteCoverDecorations for non-decorated styles', () => {
    const { container } = render(<NoteCoverDecorations coverStyle="classic-kraft" />);
    expect(container.firstChild).toBeNull();
  });

  it('verifies all 3 cover styles have valid assets and configurations', () => {
    expect(NOTE_COVER_STYLES.length).toBe(3);
    NOTE_COVER_STYLES.forEach((cover) => {
      expect(cover.id).toBeDefined();
      expect(cover.name).toBeDefined();
      expect(cover.src).toBeDefined();
    });
  });

  it('verifies all 11 seal styles have valid assets and renderIcon functions', () => {
    expect(SEAL_STYLES.length).toBe(11);
    SEAL_STYLES.forEach((seal) => {
      expect(seal.id).toBeDefined();
      expect(seal.name).toBeDefined();
      expect(seal.src).toBeDefined();
      expect(typeof seal.renderIcon).toBe('function');
      const { container } = render(<div>{seal.renderIcon({ size: 32 })}</div>);
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  it('scales seal SVG emblem and typography adaptively based on large note dimensions', () => {
    const onReveal = vi.fn();
    const compactNote: Note = {
      ...mockNote,
      width: 280,
      height: 300,
      title: 'Compact Note',
    };
    const { container: compactContainer } = render(<NoteCover note={compactNote} onReveal={onReveal} />);
    const compactSeal = compactContainer.querySelector('svg[width]');
    const compactSize = parseInt(compactSeal?.getAttribute('width') || '0', 10);

    const largeNote: Note = {
      ...mockNote,
      width: 650,
      height: 500,
      title: 'Wide Blueprint Document',
    };
    const { container: largeContainer } = render(<NoteCover note={largeNote} onReveal={onReveal} />);

    expect(screen.getByText('Wide Blueprint Document')).toBeDefined();
    const titleEl = screen.getByText('Wide Blueprint Document');
    expect(titleEl.className).toContain('text-3xl');

    const largeSeal = largeContainer.querySelector('svg[width]');
    expect(largeSeal).not.toBeNull();
    const largeSize = parseInt(largeSeal?.getAttribute('width') || '0', 10);

    // Bigger note MUST have strictly larger seal than compact note
    expect(largeSize).toBeGreaterThan(compactSize);
    expect(largeSize).toBeGreaterThan(120);
  });
});

