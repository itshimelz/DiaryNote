import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test crash in component tree');
  }
  return <div>Healthy content</div>;
};

describe('ErrorBoundary component', () => {
  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy content')).toBeDefined();
  });

  it('catches render errors and renders emergency recovery screen', () => {
    // Suppress console.error during test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Emergency Backup')).toBeDefined();
    expect(screen.getByText('Reload')).toBeDefined();
    expect(screen.getByText('Reset View')).toBeDefined();

    consoleErrorSpy.mockRestore();
  });
});
