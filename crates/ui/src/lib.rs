//! # DiaryNote Native UI Design System & Components (`ui`)
//!
//! A high-performance, modular UI design system strictly conforming to
//! DiaryNote's monochromatic desktop aesthetic.
//!
//! Features:
//! - **Standardized Design Tokens**: 4px universal corner radius (`rounded-sm`), subtle small shadows (`shadow-sm`), 4px grid spacing, and strict monochromatic light/dark surface palettes.
//! - **9 Note Paper Themes**: White, Cream, Ruled, Dotted, Ruled Dark, Kraft, Dark, Graphite, and Transparent.
//! - **Atomic UI Primitives**: `Button`, `IconButton`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Badge`, `Kbd`, `Dialog`, `Menu`, `Tabs`, `SegmentedControl`, `Select`, `Tooltip`, `Icon`.
//! - **Composite Components**: `StatusBar`, `BatchActionBar`, `NoteHeader`, `NoteToolbar`, `StylePicker`, `SlashMenu`, `MentionMenu`, `Minimap`.
//! - **Declarative Views**: `InfiniteCanvasView`, `NoteCardView`, `NotesSidebarView`, `ModalsView`.

pub mod components;
pub mod primitives;
pub mod tokens;
pub mod views;

// Top-level re-exports for easy consumption
pub use components::*;
pub use primitives::*;
pub use tokens::*;
pub use views::*;
