//! Keyboard shortcut (Kbd) badge primitive.
//!
//! Monospace hotkey pill with 2px corner radius (`rounded-xs`), subtle border, and 2xs shadow.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_XS},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Computed Kbd Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KbdStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub border: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub font_size: f32,
    pub padding_x: f32,
    pub padding_y: f32,
}

/// Declarative Kbd Component Model
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Kbd {
    pub shortcut: String,
}

impl Kbd {
    pub fn new(shortcut: impl Into<String>) -> Self {
        Self {
            shortcut: shortcut.into(),
        }
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> KbdStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (bg, fg, border) = if theme.is_dark {
            (SLATE_800, SLATE_400, SLATE_700.with_alpha(0.8))
        } else {
            (SLATE_100, SLATE_600, SLATE_200)
        };

        KbdStyle {
            bg,
            fg,
            border,
            corner_radius,
            shadow: ShadowStyle::two_xs(),
            font_size: 10.0,
            padding_x: 6.0,
            padding_y: 2.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kbd_builder() {
        let kbd = Kbd::new("Ctrl+K");
        assert_eq!(kbd.shortcut, "Ctrl+K");

        let dark = SurfaceTheme::dark();
        let style = kbd.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 2.0);
        assert_eq!(style.font_size, 10.0);
    }
}
