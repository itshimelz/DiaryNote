import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Add01Icon } from '@hugeicons/core-free-icons';

describe('Button Primitive', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders loading state and prevents click', () => {
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Loading
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with icon', () => {
    render(<Button icon={Add01Icon}>Add Item</Button>);
    expect(screen.getByRole('button', { name: /add item/i })).toBeDefined();
  });
});

describe('IconButton Primitive', () => {
  it('renders with aria-label and triggers click', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={Add01Icon}
        aria-label="Add Note"
        onClick={handleClick}
      />
    );
    const btn = screen.getByRole('button', { name: /add note/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactions when disabled', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={Add01Icon}
        aria-label="Disabled Action"
        disabled
        onClick={handleClick}
      />
    );
    const btn = screen.getByRole('button', { name: /disabled action/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
