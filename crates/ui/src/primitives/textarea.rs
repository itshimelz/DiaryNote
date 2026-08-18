//! Textarea primitive component.
//!
//! Multi-line text area with standard 4px corner radius, monochromatic border,
//! focus ring, auto-wrap, error state, and scroll containment.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Computed Textarea Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TextareaStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub placeholder: Rgba,
    pub border: Rgba,
    pub border_hover: Rgba,
    pub border_focus: Rgba,
    pub corner_radius: CornerRadii,
    pub font_size: f32,
    pub line_height: f32,
    pub padding: f32,
    pub opacity: f32,
}

/// Declarative Textarea Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Textarea {
    pub value: String,
    pub placeholder: String,
    pub rows: usize,
    pub min_height: f32,
    pub max_height: Option<f32>,
    pub has_error: bool,
    pub error_message: Option<String>,
    pub disabled: bool,
    pub read_only: bool,
}

impl Textarea {
    pub fn new(placeholder: impl Into<String>) -> Self {
        Self {
            value: String::new(),
            placeholder: placeholder.into(),
            rows: 4,
            min_height: 80.0,
            max_height: None,
            has_error: false,
            error_message: None,
            disabled: false,
            read_only: false,
        }
    }

    pub fn with_value(mut self, value: impl Into<String>) -> Self {
        self.value = value.into();
        self
    }

    pub fn with_rows(mut self, rows: usize) -> Self {
        self.rows = rows;
        self.min_height = (rows as f32) * 20.0;
        self
    }

    pub fn with_error(mut self, message: impl Into<String>) -> Self {
        self.has_error = true;
        self.error_message = Some(message.into());
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn with_read_only(mut self, read_only: bool) -> Self {
        self.read_only = read_only;
        self
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Textarea {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let min_h = gpui::px(self.min_height);
        let pad = gpui::px(style.padding);

        let mut el = gpui::div()
            .flex()
            .flex_col()
            .min_h(min_h)
            .p(pad)
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .text_color(gpui::Hsla::from(style.fg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border))
            .hover(|s| s.border_color(gpui::Hsla::from(style.border_hover)));

        if self.value.is_empty() {
            el = el.child(
                gpui::div()
                    .text_color(gpui::Hsla::from(style.placeholder))
                    .child(self.placeholder),
            );
        } else {
            el = el.child(self.value);
        }

        el
    }
}

impl Textarea {
    pub fn compute_style(&self, theme: &SurfaceTheme) -> TextareaStyle {
        let opacity = if self.disabled { 0.5 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, fg, placeholder, border, border_hover, border_focus) = if self.has_error {
            let bg = if theme.is_dark { SLATE_900 } else { WHITE };
            let fg = if theme.is_dark { SLATE_100 } else { SLATE_900 };
            (bg, fg, SLATE_400, ROSE_500, ROSE_500, ROSE_500)
        } else if theme.is_dark {
            (
                SLATE_900,
                SLATE_100,
                SLATE_500,
                SLATE_700.with_alpha(0.8),
                SLATE_600,
                SLATE_400,
            )
        } else {
            (WHITE, SLATE_900, SLATE_400, SLATE_200, SLATE_300, SLATE_600)
        };

        TextareaStyle {
            bg,
            fg,
            placeholder,
            border,
            border_hover,
            border_focus,
            corner_radius,
            font_size: 12.0,
            line_height: 1.45,
            padding: 10.0,
            opacity,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_textarea_builder() {
        let ta = Textarea::new("Enter markdown note...")
            .with_rows(6)
            .with_value("# Meeting Notes");

        assert_eq!(ta.rows, 6);
        assert_eq!(ta.min_height, 120.0);
        assert_eq!(ta.value, "# Meeting Notes");

        let dark = SurfaceTheme::dark();
        let style = ta.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.padding, 10.0);
    }
}
