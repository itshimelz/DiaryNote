//! UI Views module for DiaryNote.
//!
//! Declarative view descriptors for InfiniteCanvas, NoteCard, NotesSidebar, and Modals.

pub mod canvas_view;
pub mod modals_view;
pub mod note_card_view;
pub mod sidebar_view;

pub use canvas_view::*;
pub use modals_view::*;
pub use note_card_view::*;
pub use sidebar_view::*;
