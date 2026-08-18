//! Icon element primitive.
//!
//! Renders Hugeicons vector icons with standard 1.5px stroke weight,
//! pixel sizing (14px, 16px, 18px, 20px, 22px), and theme-adapted color.

use crate::tokens::{
    colors::Rgba,
    icons::{IconKind, IconSize, DEFAULT_ICON_STROKE_WIDTH},
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Declarative Icon Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Icon {
    pub kind: IconKind,
    pub size: IconSize,
    pub stroke_width: f32,
    pub color: Option<Rgba>,
}

impl Icon {
    pub fn new(kind: IconKind) -> Self {
        Self {
            kind,
            size: IconSize::Sm,
            stroke_width: DEFAULT_ICON_STROKE_WIDTH,
            color: None,
        }
    }

    pub fn with_size(mut self, size: IconSize) -> Self {
        self.size = size;
        self
    }

    pub fn with_color(mut self, color: Rgba) -> Self {
        self.color = Some(color);
        self
    }

    pub fn with_stroke_width(mut self, stroke_width: f32) -> Self {
        self.stroke_width = stroke_width;
        self
    }

    /// Compute resolved color and pixel dimension
    pub fn resolve(&self, theme: &SurfaceTheme) -> (Rgba, f32, f32) {
        let color = self.color.unwrap_or(theme.text);
        (color, self.size.to_pixels(), self.stroke_width)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_icon_builder() {
        let icon = Icon::new(IconKind::Search).with_size(IconSize::Lg);

        assert_eq!(icon.kind, IconKind::Search);
        assert_eq!(icon.size, IconSize::Lg);
        assert_eq!(icon.stroke_width, 1.5);

        let dark = SurfaceTheme::dark();
        let (color, pixels, stroke) = icon.resolve(&dark);
        assert_eq!(pixels, 20.0);
        assert_eq!(stroke, 1.5);
        assert_eq!(color, dark.text);
    }
}
