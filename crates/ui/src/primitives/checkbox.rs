//! Checkbox primitive component.
//!
//! Monochromatic square checkbox with subtle 2px corner radius (`rounded-xs`),
//! checkmark icon, error message, and label.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_XS},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Checkbox Size Scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum CheckboxSize {
    #[default]
    Sm, // 16x16
    Md, // 20x20
}

impl CheckboxSize {
    pub const fn box_dimension(&self) -> f32 {
        match self {
            Self::Sm => 16.0,
            Self::Md => 20.0,
        }
    }

    pub const fn icon_pixels(&self) -> f32 {
        match self {
            Self::Sm => 12.0,
            Self::Md => 14.0,
        }
    }
}

/// Computed Checkbox Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CheckboxStyle {
    pub box_bg: Rgba,
    pub box_border: Rgba,
    pub checkmark_color: Rgba,
    pub label_color: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub box_size: f32,
    pub icon_size: f32,
    pub opacity: f32,
}

/// Declarative Checkbox Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Checkbox {
    pub checked: bool,
    pub label: Option<String>,
    pub size: CheckboxSize,
    pub error: Option<String>,
    pub disabled: bool,
}

impl Checkbox {
    pub fn new(label: impl Into<String>) -> Self {
        Self {
            checked: false,
            label: Some(label.into()),
            size: CheckboxSize::Sm,
            error: None,
            disabled: false,
        }
    }

    pub fn with_checked(mut self, checked: bool) -> Self {
        self.checked = checked;
        self
    }

    pub fn with_size(mut self, size: CheckboxSize) -> Self {
        self.size = size;
        self
    }

    pub fn with_error(mut self, error: impl Into<String>) -> Self {
        self.error = Some(error.into());
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> CheckboxStyle {
        let opacity = if self.disabled { 0.5 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (box_bg, box_border, checkmark_color) = if self.checked {
            if theme.is_dark {
                (WHITE, WHITE, SLATE_900)
            } else {
                (SLATE_900, SLATE_900, WHITE)
            }
        } else if theme.is_dark {
            (SLATE_900, SLATE_700, TRANSPARENT)
        } else {
            (WHITE, SLATE_300, TRANSPARENT)
        };

        let label_color = if theme.is_dark { SLATE_200 } else { SLATE_800 };
        let shadow = if self.checked {
            ShadowStyle::two_xs()
        } else {
            ShadowStyle::none()
        };

        CheckboxStyle {
            box_bg,
            box_border,
            checkmark_color,
            label_color,
            corner_radius,
            shadow,
            box_size: self.size.box_dimension(),
            icon_size: self.size.icon_pixels(),
            opacity,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checkbox_builder() {
        let cb = Checkbox::new("Auto-lock notes")
            .with_checked(true)
            .with_size(CheckboxSize::Sm);

        assert!(cb.checked);
        assert_eq!(cb.label.as_deref(), Some("Auto-lock notes"));

        let dark = SurfaceTheme::dark();
        let style = cb.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 2.0);
        assert_eq!(style.box_bg, WHITE);
        assert_eq!(style.checkmark_color, SLATE_900);
    }
}
