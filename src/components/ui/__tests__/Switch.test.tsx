import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Switch } from '../Switch';

describe('Switch Primitive', () => {
  it('renders with label and toggles on click', () => {
    const handleChange = vi.fn();
    render(
      <Switch
        label="Snap to Grid"
        description="Align notes to a 20px spatial grid"
        checked={false}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Snap to Grid')).toBeDefined();
    expect(screen.getByText('Align notes to a 20px spatial grid')).toBeDefined();

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(switchBtn);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('toggles on space/enter keydown', () => {
    const handleChange = vi.fn();
    render(<Switch checked={true} onChange={handleChange} />);

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');

    fireEvent.keyDown(switchBtn, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(false);
  });
});
