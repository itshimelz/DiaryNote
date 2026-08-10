# DiaryNote v0.1.2

Release notes for DiaryNote v0.1.2 focusing on bundle size optimization, asset compression, CPU performance, and drag stability.

### Bundle Size Optimization

- Implemented dynamic lazy loading for non-critical modals.
- Cleaned unused dependencies and refined Rollup chunking rules.
- Reduced initial JavaScript bundle size by ~60% (363 KB to 143 KB).

### Asset Optimization

- Compressed PNG assets across public, asset, and icon directories.
- Saved over 2.4 MB in total application binary footprint.

### Performance Improvements

- Removed SVG fractal noise filter to eliminate CPU spikes on hover.
- Fast-path inline plain text rendering to bypass heavy markdown parsing passes.

### Drag and Interaction Stability

- Cleaned note card drag styles and card selection interaction.
