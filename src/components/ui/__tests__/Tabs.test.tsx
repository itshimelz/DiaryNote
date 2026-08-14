import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Tabs, TabsList, TabTrigger, TabContent } from '../Tabs';

describe('Tabs Primitive', () => {
  it('renders active tab content and switches tabs on click', () => {
    const handleChange = vi.fn();
    render(
      <Tabs value="canvas" onChange={handleChange}>
        <TabsList>
          <TabTrigger value="canvas">Canvas</TabTrigger>
          <TabTrigger value="appearance">Appearance</TabTrigger>
        </TabsList>
        <TabContent value="canvas">Canvas Settings Panel</TabContent>
        <TabContent value="appearance">Appearance Settings Panel</TabContent>
      </Tabs>
    );

    expect(screen.getByText('Canvas Settings Panel')).toBeDefined();
    expect(screen.queryByText('Appearance Settings Panel')).toBeNull();

    const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
    fireEvent.click(appearanceTab);
    expect(handleChange).toHaveBeenCalledWith('appearance');
  });
});
