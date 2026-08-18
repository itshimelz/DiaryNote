//! Text input primitive component.
//!
//! Monochromatic text box with prefix/suffix icons, clear button,
//! password visibility toggle, error state, and 4px corner radius.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Input Size Scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum InputSize {
    #[default]
    Sm,
    Md,
}

impl InputSize {
    pub const fn height(&self) -> f32 {
        match self {
            Self::Sm => 32.0,
            Self::Md => 36.0,
        }
    }

    pub const fn font_size(&self) -> f32 {
        match self {
            Self::Sm => 12.0,
            Self::Md => 13.0,
        }
    }

    pub const fn icon_size(&self) -> f32 {
        match self {
            Self::Sm => 16.0,
            Self::Md => 18.0,
        }
    }
}

/// Computed Input Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InputStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub placeholder: Rgba,
    pub border: Rgba,
    pub border_hover: Rgba,
    pub border_focus: Rgba,
    pub corner_radius: CornerRadii,
    pub height: f32,
    pub font_size: f32,
    pub icon_size: f32,
    pub padding_left: f32,
    pub padding_right: f32,
    pub opacity: f32,
}

/// Declarative Input Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Input {
    pub value: String,
    pub placeholder: String,
    pub size: InputSize,
    pub prefix_icon: Option<IconKind>,
    pub suffix_icon: Option<IconKind>,
    pub is_password: bool,
    pub show_password_toggle: bool,
    pub password_visible: bool,
    pub clearable: bool,
    pub has_error: bool,
    pub error_message: Option<String>,
    pub disabled: bool,
    pub auto_focus: bool,
    pub theme: Option<SurfaceTheme>,
}

impl Input {
    pub fn new(placeholder: impl Into<String>) -> Self {
        Self {
            value: String::new(),
            placeholder: placeholder.into(),
            size: InputSize::Sm,
            prefix_icon: None,
            suffix_icon: None,
            is_password: false,
            show_password_toggle: false,
            password_visible: false,
            clearable: false,
            has_error: false,
            error_message: None,
            disabled: false,
            auto_focus: false,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn password(placeholder: impl Into<String>) -> Self {
        Self::new(placeholder)
            .with_password(true)
            .with_password_toggle(true)
    }

    pub fn with_value(mut self, value: impl Into<String>) -> Self {
        self.value = value.into();
        self
    }

    pub fn with_size(mut self, size: InputSize) -> Self {
        self.size = size;
        self
    }

    pub fn with_prefix_icon(mut self, icon: IconKind) -> Self {
        self.prefix_icon = Some(icon);
        self
    }

    pub fn with_suffix_icon(mut self, icon: IconKind) -> Self {
        self.suffix_icon = Some(icon);
        self
    }

    pub fn with_password(mut self, is_password: bool) -> Self {
        self.is_password = is_password;
        self
    }

    pub fn with_password_toggle(mut self, toggle: bool) -> Self {
        self.show_password_toggle = toggle;
        self
    }

    pub fn with_clearable(mut self, clearable: bool) -> Self {
        self.clearable = clearable;
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
}

use gpui::prelude::*;

impl gpui::IntoElement for Input {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);
        let h = gpui::px(style.height);

        let mut el = gpui::div()
            .flex()
            .items_center()
            .h(h)
            .px(gpui::px(style.padding_left))
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
            let display_text = if self.is_password && !self.password_visible {
                "•".repeat(self.value.len())
            } else {
                self.value
            };
            el = el.child(display_text);
        }

        el
    }
}

impl Input {
    pub fn compute_style(&self, theme: &SurfaceTheme) -> InputStyle {
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

        let padding_left = if self.prefix_icon.is_some() {
            32.0
        } else {
            12.0
        };
        let mut padding_right = 12.0;
        if self.suffix_icon.is_some() || self.clearable || self.show_password_toggle {
            padding_right = 36.0;
        }

        InputStyle {
            bg,
            fg,
            placeholder,
            border,
            border_hover,
            border_focus,
            corner_radius,
            height: self.size.height(),
            font_size: self.size.font_size(),
            icon_size: self.size.icon_size(),
            padding_left,
            padding_right,
            opacity,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_input_builder() {
        let input = Input::new("Search notes...")
            .with_prefix_icon(IconKind::Search)
            .with_clearable(true);

        assert_eq!(input.placeholder, "Search notes...");
        assert_eq!(input.prefix_icon, Some(IconKind::Search));
        assert!(input.clearable);

        let dark = SurfaceTheme::dark();
        let style = input.compute_style(&dark);
        assert_eq!(style.padding_left, 32.0);
        assert_eq!(style.padding_right, 36.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
