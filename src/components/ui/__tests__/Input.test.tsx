import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Input } from '../Input';
import { Search01Icon } from '@hugeicons/core-free-icons';

describe('Input Primitive', () => {
  it('renders input with placeholder', () => {
    render(<Input placeholder="Search notes..." prefixIcon={Search01Icon} />);
    expect(screen.getByPlaceholderText('Search notes...')).toBeDefined();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Type here" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Type here');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders clear button and triggers onClear', () => {
    const handleClear = vi.fn();
    render(
      <Input
        placeholder="Clearable"
        value="Some text"
        clearable
        onClear={handleClear}
        onChange={() => {}}
      />
    );
    const clearBtn = screen.getByRole('button');
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
