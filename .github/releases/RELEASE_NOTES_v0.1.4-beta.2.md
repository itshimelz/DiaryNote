# DiaryNote v0.1.4-beta.2 (Pre-Release)

Pre-release notes for DiaryNote v0.1.4-beta.2 introducing desktop OS nativeness, precision canvas input engine, component robustness, icon scaling, and viewport-anchored zoom resets.

### Desktop OS Nativeness & Save As File Picker
- **Native Save As File Picker**: Replaced pre-saving file dumps with native OS `showSaveFilePicker` Save As dialog for backups and note exports across all formats (`.md`, `.txt`, `.json`).
- **OS-Aware Platform Detector**: Platform detection for macOS, Windows, and Linux Distros formatting shortcut badges dynamically (`⌘/⌥` vs `Ctrl/Alt`).
- **Cross-Distro System Font Fallbacks**: Integrated native Linux GTK (`Ubuntu`, `Cantarell`), macOS (`SF Pro Text`), and Windows (`Segoe UI`) system font fallbacks in CSS.

### Precision Canvas & Input Engine
- **Trackpad Pinch vs. Mouse Wheel Calibration**: Calibrated continuous trackpad pinch zoom (`0.0025` dampening) and discrete desktop mouse wheel steps (`~12%` per tick), preventing jumpy 25% → 66% → 172% zoom steps. (`commit 60479a9`)
- **Viewport-Anchored Dock Zoom Reset**: Fixed zoom percentage button in Dock to smoothly reset to 100% while keeping the current viewport center anchored instead of jumping to canvas origin. (`commit 60479a9`)
- **IME Input Protection**: Isolated single-letter canvas hotkeys (`N`, `T`, `S`, `P`, `C`) during IME composition input (CJK, Bengali) and text input focus. (`commit 577e038`)
- **Native Clipboard Listener**: Integrated window paste fallback for seamless cross-window clipboard operations on Linux Wayland/X11 and macOS. (`commit 577e038`)

### Note Component Robustness & UI Scaling
- **Collapsible Header Action Menu**: `ResizeObserver` header layout collapsing top action buttons into a `MoreVertical` overflow dropdown on cards under 280px width. (`commit 60479a9`)
- **Dynamic Ruled Line-Height Sync**: Mapped text sizes (`sm`–`xl`) to CSS variable `--ruled-line-height` (`24px`–`40px`), eliminating line drift on ruled notebook themes. (`commit 60479a9`)
- **UI Icon & Button Scale Polish**: Enlarged header and footer action icons (`w-5.5 h-5.5` / `w-6 h-6`), footer control buttons (`w-11 h-11`), style popover (`w-92`), slash menu (`w-72`), and checklist touch hit targets (`36px`). (`commit 60479a9`)
- **Performance Optimizations**: Debounced search input (150ms) and memoized note connection graph parsing for stutter-free 60fps canvas operations. (`commit 60479a9`)

### Branch Merges & Code Quality
- **Branch Merge (`feature/ai-note-merging`)**: Integrated background AI note merging services, activity tracking, and multi-note selection into `feature/desktop-os-nativeness`. (`commit 81e11ec`)
- **Type Checker & Lint Fixes**: Resolved TypeScript `KeyboardEvent` type safety issues (`tsc --noEmit` PASS with 0 errors). (`commit 577e038`)
