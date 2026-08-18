//! Canvas 2D minimap component.
//!
//! Monochromatic canvas preview floating in the top-right corner with 4px corner radius,
//! viewport indicator box, and card thumbnails.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM, CORNER_RADIUS_XS},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Computed Minimap Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MinimapStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub card_bg: Rgba,
    pub card_border: Rgba,
    pub viewport_border: Rgba,
    pub viewport_bg: Rgba,
    pub corner_radius: CornerRadii,
    pub card_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub width: f32,
    pub height: f32,
}

/// Declarative Minimap Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Minimap {
    pub width: f32,
    pub height: f32,
    pub is_expanded: bool,
}

impl Minimap {
    pub fn new() -> Self {
        Self {
            width: 180.0,
            height: 120.0,
            is_expanded: true,
        }
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> MinimapStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);
        let card_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (bg, border, card_bg, card_border, viewport_border, viewport_bg) = if theme.is_dark {
            (
                SLATE_900.with_alpha(0.85),
                SLATE_800,
                SLATE_700,
                SLATE_600,
                BLUE_500,
                BLUE_500.with_alpha(0.12),
            )
        } else {
            (
                WHITE.with_alpha(0.85),
                SLATE_200,
                SLATE_300,
                SLATE_400,
                BLUE_600,
                BLUE_600.with_alpha(0.12),
            )
        };

        MinimapStyle {
            bg,
            border,
            card_bg,
            card_border,
            viewport_border,
            viewport_bg,
            corner_radius,
            card_radius,
            shadow: ShadowStyle::sm(),
            width: self.width,
            height: self.height,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Minimap {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let w = gpui::px(style.width);
        let h = gpui::px(style.height);

        gpui::div()
            .flex()
            .items_center()
            .justify_center()
            .w(w)
            .h(h)
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border))
            .child(
                gpui::div()
                    .w(gpui::px(60.0))
                    .h(gpui::px(40.0))
                    .rounded(gpui::px(CORNER_RADIUS_XS))
                    .bg(gpui::Hsla::from(style.viewport_bg))
                    .border_1()
                    .border_color(gpui::Hsla::from(style.viewport_border)),
            )
    }
}

impl Default for Minimap {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minimap_builder() {
        let mm = Minimap::new();
        assert_eq!(mm.width, 180.0);
        assert_eq!(mm.height, 120.0);

        let dark = SurfaceTheme::dark();
        let style = mm.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.shadow, ShadowStyle::sm());
    }
}
