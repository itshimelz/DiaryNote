import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { renderInlineMarkdown } from '../inlineMarkdownScanner';
import { Note } from '../../types';

function createMockNote(id: string, title: string): Note {
  return {
    id,
    title,
    content: 'test content',
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    createdAt: '2026-08-18T00:00:00Z',
    updatedAt: '2026-08-18T00:00:00Z',
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    zIndex: 1,
  };
}

describe('renderInlineMarkdown', () => {
  it('returns plain string when no markdown tokens present', () => {
    const res = renderInlineMarkdown('Plain task item text');
    expect(res).toBe('Plain task item text');
  });

  it('renders bold, italic, code, and strikethrough in single pass', () => {
    const { container } = render(
      <div>{renderInlineMarkdown('**Bold** and *Italic* and `code` and ~~strike~~')}</div>
    );
    expect(container.querySelector('strong')?.textContent).toBe('Bold');
    expect(container.querySelector('em')?.textContent).toBe('Italic');
    expect(container.querySelector('code')?.textContent).toBe('code');
    expect(container.querySelector('del')?.textContent).toBe('strike');
  });

  it('renders internal note mentions with navigation button', () => {
    const onNavigate = vi.fn();
    const notes = [createMockNote('note-target-1', 'Architecture Plan')];

    render(
      <div>
        {renderInlineMarkdown('See @[Architecture Plan](note-target-1) for details', {
          allNotes: notes,
          onNavigateToNote: onNavigate,
        })}
      </div>
    );

    const btn = screen.getByRole('button', { name: 'Architecture Plan' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith('note-target-1');
  });

  it('renders internal hash anchor links with navigation button', () => {
    const onNavigate = vi.fn();
    render(
      <div>
        {renderInlineMarkdown('Check [Database Design](#note-db-123)', {
          onNavigateToNote: onNavigate,
        })}
      </div>
    );

    const btn = screen.getByRole('button', { name: 'Database Design' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith('db-123');
  });

  it('renders external links with target _blank', () => {
    render(
      <div>
        {renderInlineMarkdown('Visit [GitHub](https://github.com)')}
      </div>
    );

    const link = screen.getByRole('link', { name: 'GitHub' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://github.com');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
