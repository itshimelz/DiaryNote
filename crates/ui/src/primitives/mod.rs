//! UI Primitives module for DiaryNote.
//!
//! Atomic, reusable, typed UI primitives adhering to DiaryNote's monochromatic
//! design language with strict 4px small corner radii and subtle shadows.

pub mod badge;
pub mod button;
pub mod checkbox;
pub mod dialog;
pub mod icon;
pub mod icon_button;
pub mod input;
pub mod kbd;
pub mod menu;
pub mod segmented_control;
pub mod select;
pub mod switch;
pub mod tabs;
pub mod textarea;
pub mod tooltip;

pub use badge::*;
pub use button::*;
pub use checkbox::*;
pub use dialog::*;
pub use icon::*;
pub use icon_button::*;
pub use input::*;
pub use kbd::*;
pub use menu::*;
pub use segmented_control::*;
pub use select::*;
pub use switch::*;
pub use tabs::*;
pub use textarea::*;
pub use tooltip::*;
