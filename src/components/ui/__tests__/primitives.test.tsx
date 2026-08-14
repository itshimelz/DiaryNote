import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  Badge,
  Checkbox,
  Select,
  SegmentedControl,
  Tooltip,
  Menu,
  MenuItem,
  IconButton,
} from '../index';
import { Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons';

describe('UI Primitives Foundation', () => {
  it('renders Badge with variants and children', () => {
    const { rerender } = render(<Badge variant="accent">Active Note</Badge>);
    expect(screen.getByText('Active Note')).toBeDefined();

    rerender(<Badge variant="info">New Update</Badge>);
    expect(screen.getByText('New Update')).toBeDefined();
  });

  it('renders Checkbox and handles toggle changes', () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Pin Note" checked={false} onChange={handleChange} />);
    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input.checked).toBe(false);

    fireEvent.click(input);
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders Select with options and handles selection', () => {
    const handleChange = vi.fn();
    render(
      <Select
        label="Typography"
        options={[
          { value: 'sans', label: 'Google Sans' },
          { value: 'mono', label: 'Monospace' },
        ]}
        value="sans"
        onChange={handleChange}
      />
    );
    expect(screen.getByLabelText('Typography')).toBeDefined();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mono' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders SegmentedControl and handles item switching', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'text', label: 'Text' },
          { value: 'checklist', label: 'Checklist' },
        ]}
        value="text"
        onChange={handleChange}
      />
    );
    const checklistBtn = screen.getByRole('radio', { name: /checklist/i });
    fireEvent.click(checklistBtn);
    expect(handleChange).toHaveBeenCalledWith('checklist');
  });

  it('renders Tooltip on hover', () => {
    render(
      <Tooltip content="Quick Search" shortcut="Ctrl+K">
        <button type="button">Trigger</button>
      </Tooltip>
    );
    const btn = screen.getByText('Trigger');
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(screen.getByText('Quick Search')).toBeDefined();
    expect(screen.getByText('Ctrl+K')).toBeDefined();
  });

  it('renders Menu and MenuItem with keyboard shortcuts', () => {
    const handleClick = vi.fn();
    render(
      <Menu>
        <MenuItem
          icon={Search01Icon}
          label="Search Notes"
          shortcut="Ctrl+K"
          onClick={handleClick}
        />
      </Menu>
    );
    const item = screen.getByRole('menuitem');
    expect(item).toBeDefined();
    expect(screen.getByText('Search Notes')).toBeDefined();
    expect(screen.getByText('Ctrl+K')).toBeDefined();

    fireEvent.click(item);
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders IconButton with sizes and active states', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={Tick02Icon}
        aria-label="Confirm"
        size="lg"
        active
        onClick={handleClick}
      />
    );
    const btn = screen.getByRole('button', { name: /confirm/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalled();
  });
});
