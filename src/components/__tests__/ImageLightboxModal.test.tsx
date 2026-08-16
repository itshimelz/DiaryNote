import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightboxModal } from '../Modals/ImageLightboxModal';

describe('ImageLightboxModal component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    imageUrl: 'https://example.com/test-photo.jpg',
    title: 'Test Photo',
    caption: 'Sample caption for testing',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title, image, caption and controls toolbar', () => {
    render(<ImageLightboxModal {...defaultProps} />);

    expect(screen.getByText('Test Photo')).toBeTruthy();
    expect(screen.getByText('Sample caption for testing')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    const img = screen.getByAltText('Test Photo');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/test-photo.jpg');
  });

  it('handles zoom in, zoom out, and reset zoom interactions', () => {
    render(<ImageLightboxModal {...defaultProps} />);

    const zoomInBtn = screen.getByTitle('Zoom In (+)');
    const zoomOutBtn = screen.getByTitle('Zoom Out (-)');
    const resetBtn = screen.getByTitle('Reset Zoom (0)');

    // Zoom In
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeTruthy();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeTruthy();

    // Zoom Out
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('125%')).toBeTruthy();

    // Reset Zoom
    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('toggles zoom on double click', () => {
    render(<ImageLightboxModal {...defaultProps} />);

    const img = screen.getByAltText('Test Photo');
    expect(img).toBeTruthy();

    const containerDiv = document.querySelector('[class*="bg-slate-950"]');
    expect(containerDiv).toBeTruthy();

    // Double click to zoom in
    fireEvent.doubleClick(containerDiv!);
    expect(screen.getByText('225%')).toBeTruthy();

    // Double click again to reset zoom
    fireEvent.doubleClick(containerDiv!);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('rotates image on rotate button click and handles keyboard shortcuts', () => {
    const onClose = vi.fn();
    render(<ImageLightboxModal {...defaultProps} onClose={onClose} />);

    const rotateBtn = screen.getByTitle('Rotate 90° (R)');
    fireEvent.click(rotateBtn);

    const img = screen.getByAltText('Test Photo');
    expect(img.style.transform).toContain('rotate(90deg)');

    // Test '+' keyboard shortcut for zoom in
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByText('125%')).toBeTruthy();

    // Test '-' keyboard shortcut for zoom out
    fireEvent.keyDown(window, { key: '-' });
    expect(screen.getByText('100%')).toBeTruthy();

    // Test 'Escape' key for closing
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles mouse wheel zoom', () => {
    render(<ImageLightboxModal {...defaultProps} />);

    const containerDiv = document.querySelector('[class*="bg-slate-950"]');
    expect(containerDiv).toBeTruthy();

    // Wheel up zooms in
    fireEvent.wheel(containerDiv!, { deltaY: -100 });
    expect(screen.getByText('120%')).toBeTruthy();

    // Wheel down zooms out
    fireEvent.wheel(containerDiv!, { deltaY: 100 });
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
