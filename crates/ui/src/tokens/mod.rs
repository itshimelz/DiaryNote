//! Design system tokens for DiaryNote.
//!
//! Monochromatic slate surfaces, small 4px corner radii, subtle shadows,
//! 9 note paper themes, typography, spacing, and icon definitions.

pub mod canvas;
pub mod colors;
pub mod decorations;
pub mod icons;
pub mod paper_themes;
pub mod radius;
pub mod shadows;
pub mod spacing;
pub mod surfaces;
pub mod typography;

// Re-export core tokens for convenient top-level access
pub use canvas::*;
pub use colors::*;
pub use decorations::*;
pub use icons::*;
pub use paper_themes::*;
pub use radius::*;
pub use shadows::*;
pub use spacing::*;
pub use surfaces::*;
pub use typography::*;
