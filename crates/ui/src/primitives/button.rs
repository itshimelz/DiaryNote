//! Button primitive component.
//!
//! Monochromatic primary/secondary/danger/ghost/outline variants,
//! strict 4px corner radius, loading spinner state, and icon left/right positioning.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Button Visual Variant
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ButtonVariant {
    #[default]
    Secondary,
    Primary,
    Danger,
    Ghost,
    Outline,
}

/// Button Size Scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ButtonSize {
    Xs,
    #[default]
    Sm,
    Md,
}

impl ButtonSize {
    pub const fn height(&self) -> f32 {
        match self {
            Self::Xs => 24.0,
            Self::Sm => 32.0,
            Self::Md => 36.0,
        }
    }

    pub const fn padding_x(&self) -> f32 {
        match self {
            Self::Xs => 8.0,
            Self::Sm => 12.0,
            Self::Md => 14.0,
        }
    }

    pub const fn font_size(&self) -> f32 {
        match self {
            Self::Xs => 11.0,
            Self::Sm => 12.0,
            Self::Md => 13.0,
        }
    }

    pub const fn icon_size(&self) -> f32 {
        match self {
            Self::Xs => 14.0,
            Self::Sm => 16.0,
            Self::Md => 16.0,
        }
    }

    pub const fn gap(&self) -> f32 {
        match self {
            Self::Xs => 4.0,
            Self::Sm => 6.0,
            Self::Md => 8.0,
        }
    }
}

/// Icon Placement
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum IconPosition {
    #[default]
    Left,
    Right,
}

/// Button Resolved Visual Style computed against active surface theme
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ButtonStyle {
    pub bg: Rgba,
    pub bg_hover: Rgba,
    pub fg: Rgba,
    pub fg_hover: Rgba,
    pub border: Option<Rgba>,
    pub border_hover: Option<Rgba>,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub opacity: f32,
    pub height: f32,
    pub padding_x: f32,
    pub font_size: f32,
    pub gap: f32,
}

/// Declarative Button Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Button {
    pub label: Option<String>,
    pub variant: ButtonVariant,
    pub size: ButtonSize,
    pub icon: Option<IconKind>,
    pub icon_position: IconPosition,
    pub loading: bool,
    pub disabled: bool,
    pub full_width: bool,
}

impl Button {
    pub fn new(label: impl Into<String>) -> Self {
        Self {
            label: Some(label.into()),
            variant: ButtonVariant::Secondary,
            size: ButtonSize::Sm,
            icon: None,
            icon_position: IconPosition::Left,
            loading: false,
            disabled: false,
            full_width: false,
        }
    }

    pub fn primary(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(ButtonVariant::Primary)
    }

    pub fn danger(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(ButtonVariant::Danger)
    }

    pub fn ghost(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(ButtonVariant::Ghost)
    }

    pub fn outline(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(ButtonVariant::Outline)
    }

    pub fn with_variant(mut self, variant: ButtonVariant) -> Self {
        self.variant = variant;
        self
    }

    pub fn with_size(mut self, size: ButtonSize) -> Self {
        self.size = size;
        self
    }

    pub fn with_icon(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self
    }

    pub fn with_icon_right(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self.icon_position = IconPosition::Right;
        self
    }

    pub fn with_loading(mut self, loading: bool) -> Self {
        self.loading = loading;
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn with_full_width(mut self, full_width: bool) -> Self {
        self.full_width = full_width;
        self
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Button {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let mut el = gpui::div()
            .flex()
            .items_center()
            .justify_center()
            .gap_1()
            .h(gpui::px(self.size.height()))
            .px(gpui::px(self.size.padding_x()))
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .text_color(gpui::Hsla::from(style.fg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border.unwrap_or(TRANSPARENT)))
            .hover(|s| s.bg(gpui::Hsla::from(style.bg_hover)));

        if self.full_width {
            el = el.w_full();
        }

        if let Some(label) = self.label {
            el = el.child(label);
        }

        el
    }
}

impl Button {
    /// Resolve computed style given the active theme
    pub fn compute_style(&self, theme: &SurfaceTheme) -> ButtonStyle {
        let is_disabled = self.disabled || self.loading;
        let opacity = if is_disabled { 0.5 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, bg_hover, fg, fg_hover, border, border_hover, shadow) = match self.variant {
            ButtonVariant::Primary => {
                if theme.is_dark {
                    (
                        WHITE,
                        SLATE_100,
                        SLATE_900,
                        SLATE_950,
                        None,
                        None,
                        ShadowStyle::xs(),
                    )
                } else {
                    (
                        SLATE_900,
                        SLATE_800,
                        WHITE,
                        WHITE,
                        None,
                        None,
                        ShadowStyle::xs(),
                    )
                }
            }
            ButtonVariant::Secondary => {
                if theme.is_dark {
                    (
                        SLATE_800,
                        SLATE_700,
                        SLATE_300,
                        SLATE_100,
                        Some(SLATE_700),
                        Some(SLATE_600),
                        ShadowStyle::none(),
                    )
                } else {
                    (
                        SLATE_100,
                        SLATE_200,
                        SLATE_700,
                        SLATE_900,
                        Some(SLATE_200),
                        Some(SLATE_300),
                        ShadowStyle::none(),
                    )
                }
            }
            ButtonVariant::Danger => (
                ROSE_600,
                ROSE_500,
                WHITE,
                WHITE,
                None,
                None,
                ShadowStyle::xs(),
            ),
            ButtonVariant::Ghost => {
                if theme.is_dark {
                    (
                        TRANSPARENT,
                        SLATE_800,
                        SLATE_400,
                        SLATE_100,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                } else {
                    (
                        TRANSPARENT,
                        SLATE_100,
                        SLATE_600,
                        SLATE_900,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                }
            }
            ButtonVariant::Outline => {
                if theme.is_dark {
                    (
                        TRANSPARENT,
                        SLATE_800,
                        SLATE_300,
                        SLATE_100,
                        Some(SLATE_700),
                        Some(SLATE_600),
                        ShadowStyle::none(),
                    )
                } else {
                    (
                        TRANSPARENT,
                        SLATE_100,
                        SLATE_700,
                        SLATE_900,
                        Some(SLATE_300),
                        Some(SLATE_400),
                        ShadowStyle::none(),
                    )
                }
            }
        };

        ButtonStyle {
            bg,
            bg_hover,
            fg,
            fg_hover,
            border,
            border_hover,
            corner_radius,
            shadow,
            opacity,
            height: self.size.height(),
            padding_x: self.size.padding_x(),
            font_size: self.size.font_size(),
            gap: self.size.gap(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_button_builder() {
        let btn = Button::primary("Save Note")
            .with_size(ButtonSize::Sm)
            .with_icon(IconKind::Check);

        assert_eq!(btn.label.as_deref(), Some("Save Note"));
        assert_eq!(btn.variant, ButtonVariant::Primary);
        assert_eq!(btn.size, ButtonSize::Sm);
        assert_eq!(btn.icon, Some(IconKind::Check));

        let dark_theme = SurfaceTheme::dark();
        let style = btn.compute_style(&dark_theme);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.opacity, 1.0);
    }
}
