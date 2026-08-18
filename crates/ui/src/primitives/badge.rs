//! Badge primitive component.
//!
//! Compact indicator chip with 2px corner radius (`rounded-xs`),
//! status variants (Default, Subtle, Accent, Danger, Success, Warning, Info, Outline),
//! and optional leading icon.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_XS},
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Badge Visual Variant
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum BadgeVariant {
    #[default]
    Default,
    Subtle,
    Accent,
    Danger,
    Success,
    Warning,
    Info,
    Outline,
}

/// Badge Size Scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum BadgeSize {
    #[default]
    Xs,
    Sm,
}

impl BadgeSize {
    pub const fn font_size(&self) -> f32 {
        match self {
            Self::Xs => 10.0,
            Self::Sm => 11.0,
        }
    }

    pub const fn padding_x(&self) -> f32 {
        match self {
            Self::Xs => 6.0,
            Self::Sm => 8.0,
        }
    }

    pub const fn padding_y(&self) -> f32 {
        match self {
            Self::Xs => 2.0,
            Self::Sm => 3.0,
        }
    }

    pub const fn icon_size(&self) -> f32 {
        match self {
            Self::Xs => 10.0,
            Self::Sm => 12.0,
        }
    }
}

/// Computed Badge Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BadgeStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub border: Option<Rgba>,
    pub corner_radius: CornerRadii,
    pub font_size: f32,
    pub padding_x: f32,
    pub padding_y: f32,
    pub icon_size: f32,
}

/// Declarative Badge Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Badge {
    pub label: String,
    pub variant: BadgeVariant,
    pub size: BadgeSize,
    pub icon: Option<IconKind>,
}

impl Badge {
    pub fn new(label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
            variant: BadgeVariant::Default,
            size: BadgeSize::Xs,
            icon: None,
        }
    }

    pub fn subtle(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(BadgeVariant::Subtle)
    }

    pub fn accent(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(BadgeVariant::Accent)
    }

    pub fn danger(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(BadgeVariant::Danger)
    }

    pub fn success(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(BadgeVariant::Success)
    }

    pub fn warning(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(BadgeVariant::Warning)
    }

    pub fn info(label: impl Into<String>) -> Self {
        Self::new(label).with_variant(BadgeVariant::Info)
    }

    pub fn with_variant(mut self, variant: BadgeVariant) -> Self {
        self.variant = variant;
        self
    }

    pub fn with_size(mut self, size: BadgeSize) -> Self {
        self.size = size;
        self
    }

    pub fn with_icon(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> BadgeStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (bg, fg, border) = match self.variant {
            BadgeVariant::Default => {
                if theme.is_dark {
                    (SLATE_800, SLATE_300, Some(SLATE_700.with_alpha(0.8)))
                } else {
                    (SLATE_100, SLATE_700, Some(SLATE_200))
                }
            }
            BadgeVariant::Subtle => {
                if theme.is_dark {
                    (
                        SLATE_800.with_alpha(0.8),
                        SLATE_300,
                        Some(SLATE_700.with_alpha(0.6)),
                    )
                } else {
                    (SLATE_100, SLATE_600, Some(SLATE_200.with_alpha(0.8)))
                }
            }
            BadgeVariant::Accent => {
                if theme.is_dark {
                    (SLATE_100, SLATE_900, None)
                } else {
                    (SLATE_900, WHITE, None)
                }
            }
            BadgeVariant::Danger => {
                if theme.is_dark {
                    (
                        ROSE_950.with_alpha(0.4),
                        ROSE_400,
                        Some(ROSE_950.with_alpha(0.6)),
                    )
                } else {
                    (ROSE_50, ROSE_600, Some(ROSE_500.with_alpha(0.3)))
                }
            }
            BadgeVariant::Success => {
                if theme.is_dark {
                    (
                        EMERALD_950.with_alpha(0.4),
                        EMERALD_400,
                        Some(EMERALD_950.with_alpha(0.6)),
                    )
                } else {
                    (EMERALD_50, EMERALD_600, Some(EMERALD_500.with_alpha(0.3)))
                }
            }
            BadgeVariant::Warning => {
                if theme.is_dark {
                    (
                        AMBER_950.with_alpha(0.4),
                        AMBER_400,
                        Some(AMBER_950.with_alpha(0.6)),
                    )
                } else {
                    (AMBER_50, AMBER_600, Some(AMBER_500.with_alpha(0.3)))
                }
            }
            BadgeVariant::Info => {
                if theme.is_dark {
                    (
                        SKY_950.with_alpha(0.4),
                        SKY_400,
                        Some(SKY_950.with_alpha(0.6)),
                    )
                } else {
                    (SKY_50, SKY_600, Some(SKY_500.with_alpha(0.3)))
                }
            }
            BadgeVariant::Outline => {
                if theme.is_dark {
                    (TRANSPARENT, SLATE_300, Some(SLATE_700))
                } else {
                    (TRANSPARENT, SLATE_700, Some(SLATE_300))
                }
            }
        };

        BadgeStyle {
            bg,
            fg,
            border,
            corner_radius,
            font_size: self.size.font_size(),
            padding_x: self.size.padding_x(),
            padding_y: self.size.padding_y(),
            icon_size: self.size.icon_size(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_badge_builder() {
        let badge = Badge::success("Synced")
            .with_icon(IconKind::Check)
            .with_size(BadgeSize::Xs);

        assert_eq!(badge.label, "Synced");
        assert_eq!(badge.variant, BadgeVariant::Success);
        assert_eq!(badge.icon, Some(IconKind::Check));

        let dark = SurfaceTheme::dark();
        let style = badge.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 2.0);
        assert_eq!(style.font_size, 10.0);
    }
}
