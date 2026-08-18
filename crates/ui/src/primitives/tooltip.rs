//! Tooltip primitive component.
//!
//! Hover tooltip with 2px corner radius (`rounded-xs`), hotkey shortcut,
//! subtle shadow, and top/bottom/left/right positioning.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_XS},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Tooltip Anchor Position
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TooltipPosition {
    #[default]
    Top,
    Bottom,
    Left,
    Right,
}

/// Computed Tooltip Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TooltipStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub font_size: f32,
    pub padding_x: f32,
    pub padding_y: f32,
}

/// Declarative Tooltip Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Tooltip {
    pub content: String,
    pub shortcut: Option<String>,
    pub position: TooltipPosition,
    pub theme: Option<SurfaceTheme>,
}

impl Tooltip {
    pub fn new(content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            shortcut: None,
            position: TooltipPosition::Top,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn with_shortcut(mut self, shortcut: impl Into<String>) -> Self {
        self.shortcut = Some(shortcut.into());
        self
    }

    pub fn with_position(mut self, position: TooltipPosition) -> Self {
        self.position = position;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> TooltipStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (bg, fg) = if theme.is_dark {
            (SLATE_100, SLATE_900)
        } else {
            (SLATE_900, WHITE)
        };

        TooltipStyle {
            bg,
            fg,
            corner_radius,
            shadow: ShadowStyle::sm(),
            font_size: 11.0,
            padding_x: 8.0,
            padding_y: 4.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Tooltip {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);

        let mut tip = gpui::div()
            .flex()
            .items_center()
            .gap_1()
            .px(gpui::px(style.padding_x))
            .py(gpui::px(style.padding_y))
            .rounded(gpui::px(CORNER_RADIUS_XS))
            .bg(gpui::Hsla::from(style.bg))
            .text_color(gpui::Hsla::from(style.fg))
            .child(self.content);

        if let Some(shortcut) = self.shortcut {
            tip = tip.child(
                gpui::div()
                    .text_color(gpui::Hsla::from(SLATE_400))
                    .child(shortcut),
            );
        }

        tip
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tooltip_builder() {
        let tt = Tooltip::new("Undo").with_shortcut("Ctrl+Z");
        assert_eq!(tt.content, "Undo");
        assert_eq!(tt.shortcut.as_deref(), Some("Ctrl+Z"));

        let dark = SurfaceTheme::dark();
        let style = tt.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 2.0);
        assert_eq!(style.bg, SLATE_100);
        assert_eq!(style.fg, SLATE_900);
    }
}
