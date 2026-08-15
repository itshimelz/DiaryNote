import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NoteDecorations } from '../NoteDecorations';

describe('NoteDecorations component', () => {
  it('renders nothing when pinStyle is none or undefined', () => {
    const { container: c1 } = render(<NoteDecorations pinStyle="none" />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<NoteDecorations pinStyle={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders 3D pushpin with realistic SVG lighting for red pin', () => {
    const { container } = render(<NoteDecorations pinStyle="pushpin-red" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('[title="Pinned"]')).toBeTruthy();
  });

  it('renders 3D pushpin for blue, yellow, and green pins', () => {
    const { container: blue } = render(<NoteDecorations pinStyle="pushpin-blue" />);
    expect(blue.querySelector('svg')).toBeTruthy();

    const { container: yellow } = render(<NoteDecorations pinStyle="pushpin-yellow" />);
    expect(yellow.querySelector('svg')).toBeTruthy();

    const { container: green } = render(<NoteDecorations pinStyle="pushpin-green" />);
    expect(green.querySelector('svg')).toBeTruthy();
  });

  it('renders washi tape strip with texture for teal, pink, beige, and yellow tape', () => {
    const { container: teal } = render(<NoteDecorations pinStyle="tape-teal" />);
    expect(teal.querySelector('div')).toBeTruthy();
    expect(teal.querySelector('[title="Taped"]')).toBeTruthy();

    const { container: pink } = render(<NoteDecorations pinStyle="tape-pink" />);
    expect(pink.querySelector('[title="Taped"]')).toBeTruthy();

    const { container: beige } = render(<NoteDecorations pinStyle="tape-beige" />);
    expect(beige.querySelector('[title="Taped"]')).toBeTruthy();

    const { container: yellow } = render(<NoteDecorations pinStyle="tape-yellow" />);
    expect(yellow.querySelector('[title="Taped"]')).toBeTruthy();
  });

  it('respects allowedTypes="tape-only" by suppressing pushpins and rendering tape', () => {
    const { container: pin } = render(
      <NoteDecorations pinStyle="pushpin-red" allowedTypes="tape-only" />
    );
    expect(pin.firstChild).toBeNull();

    const { container: tape } = render(
      <NoteDecorations pinStyle="tape-teal" allowedTypes="tape-only" />
    );
    expect(tape.querySelector('[title="Taped"]')).toBeTruthy();
  });
});
