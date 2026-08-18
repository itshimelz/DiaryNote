//! Dialog (modal window) primitive component.
//!
//! Monochromatic centered dialog overlay with backdrop dimming,
//! 4px corner radius, subtle shadow, header, body, footer, and Escape key dismissal.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Dialog Max Width Constraint
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum DialogMaxWidth {
    Sm, // 384px
    #[default]
    Md, // 448px
    Lg, // 512px
    Xl, // 576px
    TwoXl, // 672px
    ThreeXl, // 768px
}

impl DialogMaxWidth {
    pub const fn to_pixels(&self) -> f32 {
        match self {
            Self::Sm => 384.0,
            Self::Md => 448.0,
            Self::Lg => 512.0,
            Self::Xl => 576.0,
            Self::TwoXl => 672.0,
            Self::ThreeXl => 768.0,
        }
    }
}

/// Computed Dialog Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DialogStyle {
    pub backdrop_bg: Rgba,
    pub container_bg: Rgba,
    pub container_border: Rgba,
    pub title_color: Rgba,
    pub description_color: Rgba,
    pub divider_color: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub max_width: f32,
    pub padding: f32,
}

/// Dialog Header Specification
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DialogHeader {
    pub title: String,
    pub description: Option<String>,
    pub show_close_button: bool,
}

/// Declarative Dialog Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Dialog {
    pub is_open: bool,
    pub max_width: DialogMaxWidth,
    pub header: Option<DialogHeader>,
    pub show_backdrop: bool,
    pub close_on_backdrop_click: bool,
    pub close_on_escape: bool,
    pub theme: Option<SurfaceTheme>,
}

impl Dialog {
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            is_open: true,
            max_width: DialogMaxWidth::Md,
            header: Some(DialogHeader {
                title: title.into(),
                description: None,
                show_close_button: true,
            }),
            show_backdrop: true,
            close_on_backdrop_click: true,
            close_on_escape: true,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        if let Some(ref mut header) = self.header {
            header.description = Some(description.into());
        }
        self
    }

    pub fn with_max_width(mut self, max_width: DialogMaxWidth) -> Self {
        self.max_width = max_width;
        self
    }

    pub fn with_open(mut self, is_open: bool) -> Self {
        self.is_open = is_open;
        self
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Dialog {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        if !self.is_open {
            return gpui::div();
        }

        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);
        let max_w = gpui::px(style.max_width);
        let pad = gpui::px(style.padding);

        let mut container = gpui::div()
            .flex()
            .flex_col()
            .w_full()
            .max_w(max_w)
            .p(pad)
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.container_bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.container_border));

        if let Some(ref header) = self.header {
            let mut header_el = gpui::div()
                .flex()
                .items_center()
                .justify_between()
                .pb_3()
                .border_b_1()
                .border_color(gpui::Hsla::from(style.divider_color));

            let mut titles = gpui::div().flex().flex_col();
            titles = titles.child(
                gpui::div()
                    .text_color(gpui::Hsla::from(style.title_color))
                    .child(header.title.clone()),
            );
            if let Some(ref desc) = header.description {
                titles = titles.child(
                    gpui::div()
                        .text_color(gpui::Hsla::from(style.description_color))
                        .child(desc.clone()),
                );
            }
            header_el = header_el.child(titles);
            container = container.child(header_el);
        }

        if self.show_backdrop {
            gpui::div()
                .absolute()
                .inset_0()
                .flex()
                .items_center()
                .justify_center()
                .bg(gpui::Hsla::from(style.backdrop_bg))
                .child(container)
        } else {
            container
        }
    }
}

impl Dialog {
    pub fn compute_style(&self, theme: &SurfaceTheme) -> DialogStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (container_bg, container_border, title_color, description_color, divider_color) =
            if theme.is_dark {
                (SLATE_900, SLATE_800, SLATE_100, SLATE_400, SLATE_800)
            } else {
                (WHITE, SLATE_200, SLATE_900, SLATE_500, SLATE_200)
            };

        DialogStyle {
            backdrop_bg: BLACK.with_alpha(0.6),
            container_bg,
            container_border,
            title_color,
            description_color,
            divider_color,
            corner_radius,
            shadow: ShadowStyle::lg(),
            max_width: self.max_width.to_pixels(),
            padding: 24.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dialog_builder() {
        let dialog = Dialog::new("Delete Note?")
            .with_description("This action cannot be undone.")
            .with_max_width(DialogMaxWidth::Sm);

        assert!(dialog.is_open);
        assert_eq!(dialog.header.as_ref().unwrap().title, "Delete Note?");

        let dark = SurfaceTheme::dark();
        let style = dialog.compute_style(&dark);
        assert_eq!(style.max_width, 384.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
