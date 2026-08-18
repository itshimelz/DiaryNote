//! IconButton primitive component.
//!
//! Compact square icon button with subtle/ghost/primary/danger/active variants,
//! 4px corner radius, active status, tooltip, and accessible label.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Icon Button Variant
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum IconButtonVariant {
    #[default]
    Ghost,
    Subtle,
    Primary,
    Danger,
    Active,
    Success,
    Warning,
}

/// Icon Button Size Scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum IconButtonSize {
    Xs, // 20x20
    #[default]
    Sm, // 28x28
    Md, // 32x32
    Lg, // 36x36
    Xl, // 40x40
}

impl IconButtonSize {
    pub const fn dimension(&self) -> f32 {
        match self {
            Self::Xs => 20.0,
            Self::Sm => 28.0,
            Self::Md => 32.0,
            Self::Lg => 36.0,
            Self::Xl => 40.0,
        }
    }

    pub const fn icon_pixels(&self) -> f32 {
        match self {
            Self::Xs => 14.0,
            Self::Sm => 16.0,
            Self::Md => 18.0,
            Self::Lg => 20.0,
            Self::Xl => 22.0,
        }
    }
}

/// Computed Icon Button Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IconButtonStyle {
    pub bg: Rgba,
    pub bg_hover: Rgba,
    pub fg: Rgba,
    pub fg_hover: Rgba,
    pub border: Option<Rgba>,
    pub border_hover: Option<Rgba>,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub opacity: f32,
    pub size: f32,
    pub icon_size: f32,
}

/// Declarative IconButton Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IconButton {
    pub icon: IconKind,
    pub variant: IconButtonVariant,
    pub size: IconButtonSize,
    pub active: bool,
    pub disabled: bool,
    pub aria_label: String,
    pub tooltip: Option<String>,
}

impl IconButton {
    pub fn new(icon: IconKind, aria_label: impl Into<String>) -> Self {
        Self {
            icon,
            variant: IconButtonVariant::Ghost,
            size: IconButtonSize::Sm,
            active: false,
            disabled: false,
            aria_label: aria_label.into(),
            tooltip: None,
        }
    }

    pub fn subtle(icon: IconKind, aria_label: impl Into<String>) -> Self {
        Self::new(icon, aria_label).with_variant(IconButtonVariant::Subtle)
    }

    pub fn primary(icon: IconKind, aria_label: impl Into<String>) -> Self {
        Self::new(icon, aria_label).with_variant(IconButtonVariant::Primary)
    }

    pub fn danger(icon: IconKind, aria_label: impl Into<String>) -> Self {
        Self::new(icon, aria_label).with_variant(IconButtonVariant::Danger)
    }

    pub fn with_variant(mut self, variant: IconButtonVariant) -> Self {
        self.variant = variant;
        self
    }

    pub fn with_size(mut self, size: IconButtonSize) -> Self {
        self.size = size;
        self
    }

    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn with_tooltip(mut self, tooltip: impl Into<String>) -> Self {
        self.tooltip = Some(tooltip.into());
        self
    }

    /// Resolve computed style given the active theme
    pub fn compute_style(&self, theme: &SurfaceTheme) -> IconButtonStyle {
        let opacity = if self.disabled { 0.4 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);
        let effective_variant = if self.active {
            IconButtonVariant::Active
        } else {
            self.variant
        };

        let (bg, bg_hover, fg, fg_hover, border, border_hover, shadow) = match effective_variant {
            IconButtonVariant::Ghost => {
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
                        SLATE_500,
                        SLATE_900,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                }
            }
            IconButtonVariant::Subtle => {
                if theme.is_dark {
                    (
                        SLATE_800.with_alpha(0.8),
                        SLATE_700,
                        SLATE_300,
                        SLATE_100,
                        Some(SLATE_700.with_alpha(0.5)),
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
            IconButtonVariant::Primary => {
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
            IconButtonVariant::Danger => {
                if theme.is_dark {
                    (
                        TRANSPARENT,
                        ROSE_950.with_alpha(0.4),
                        ROSE_500,
                        ROSE_500,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                } else {
                    (
                        TRANSPARENT,
                        ROSE_50,
                        ROSE_500,
                        ROSE_600,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                }
            }
            IconButtonVariant::Active => {
                if theme.is_dark {
                    (
                        SLATE_100,
                        WHITE,
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
            IconButtonVariant::Success => {
                if theme.is_dark {
                    (
                        TRANSPARENT,
                        EMERALD_950.with_alpha(0.4),
                        EMERALD_500,
                        EMERALD_500,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                } else {
                    (
                        TRANSPARENT,
                        EMERALD_50,
                        EMERALD_600,
                        EMERALD_600,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                }
            }
            IconButtonVariant::Warning => {
                if theme.is_dark {
                    (
                        TRANSPARENT,
                        AMBER_950.with_alpha(0.4),
                        AMBER_500,
                        AMBER_500,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                } else {
                    (
                        TRANSPARENT,
                        AMBER_50,
                        AMBER_600,
                        AMBER_600,
                        None,
                        None,
                        ShadowStyle::none(),
                    )
                }
            }
        };

        IconButtonStyle {
            bg,
            bg_hover,
            fg,
            fg_hover,
            border,
            border_hover,
            corner_radius,
            shadow,
            opacity,
            size: self.size.dimension(),
            icon_size: self.size.icon_pixels(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_icon_button_builder() {
        let btn = IconButton::subtle(IconKind::Pin, "Pin note")
            .with_size(IconButtonSize::Lg)
            .with_active(true);

        assert_eq!(btn.icon, IconKind::Pin);
        assert_eq!(btn.size, IconButtonSize::Lg);
        assert!(btn.active);

        let dark_theme = SurfaceTheme::dark();
        let style = btn.compute_style(&dark_theme);
        assert_eq!(style.size, 36.0);
        assert_eq!(style.icon_size, 20.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
