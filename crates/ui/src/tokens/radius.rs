//! Corner radius design tokens and geometric rounding primitives.
//!
//! Standardized strictly to small corner radiuses (4.0px standard, 2.0px micro, 9999px full).

use serde::{Deserialize, Serialize};

/// Standard Corner Radius constants (in logical pixels)
pub const CORNER_RADIUS_NONE: f32 = 0.0;
pub const CORNER_RADIUS_2XS: f32 = 1.0;
pub const CORNER_RADIUS_XS: f32 = 2.0; // Kbd, inline badges, check boxes, tags
pub const CORNER_RADIUS_SM: f32 = 4.0; // Universal standard: buttons, cards, dialogs, inputs, menus, dock
pub const CORNER_RADIUS_MD: f32 = 6.0; // Container frames, preview modals
pub const CORNER_RADIUS_LG: f32 = 8.0; // Large dialog overlays
pub const CORNER_RADIUS_FULL: f32 = 9999.0; // Circular badges, toggle pills, dots

/// Named corner radius scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum RadiusSize {
    None,
    #[serde(rename = "2xs")]
    TwoXs,
    Xs,
    #[default]
    Sm,
    Md,
    Lg,
    Full,
}

impl RadiusSize {
    /// Return the numerical radius in logical pixels
    pub const fn to_pixels(&self) -> f32 {
        match self {
            Self::None => CORNER_RADIUS_NONE,
            Self::TwoXs => CORNER_RADIUS_2XS,
            Self::Xs => CORNER_RADIUS_XS,
            Self::Sm => CORNER_RADIUS_SM,
            Self::Md => CORNER_RADIUS_MD,
            Self::Lg => CORNER_RADIUS_LG,
            Self::Full => CORNER_RADIUS_FULL,
        }
    }

    /// Return the GPUI pixel length
    pub fn to_gpui_px(&self) -> gpui::Pixels {
        gpui::px(self.to_pixels())
    }
}

/// Precise per-corner rounding specification
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CornerRadii {
    pub top_left: f32,
    pub top_right: f32,
    pub bottom_right: f32,
    pub bottom_left: f32,
}

impl CornerRadii {
    pub const ZERO: Self = Self::uniform(CORNER_RADIUS_NONE);
    pub const XS: Self = Self::uniform(CORNER_RADIUS_XS);
    pub const SM: Self = Self::uniform(CORNER_RADIUS_SM);
    pub const MD: Self = Self::uniform(CORNER_RADIUS_MD);
    pub const FULL: Self = Self::uniform(CORNER_RADIUS_FULL);

    pub fn to_gpui_corners(&self) -> gpui::Corners<gpui::Pixels> {
        gpui::Corners {
            top_left: gpui::px(self.top_left),
            top_right: gpui::px(self.top_right),
            bottom_right: gpui::px(self.bottom_right),
            bottom_left: gpui::px(self.bottom_left),
        }
    }

    pub const fn uniform(radius: f32) -> Self {
        Self {
            top_left: radius,
            top_right: radius,
            bottom_right: radius,
            bottom_left: radius,
        }
    }

    pub const fn top_only(radius: f32) -> Self {
        Self {
            top_left: radius,
            top_right: radius,
            bottom_right: 0.0,
            bottom_left: 0.0,
        }
    }

    pub const fn bottom_only(radius: f32) -> Self {
        Self {
            top_left: 0.0,
            top_right: 0.0,
            bottom_right: radius,
            bottom_left: radius,
        }
    }

    pub const fn from_size(size: RadiusSize) -> Self {
        Self::uniform(size.to_pixels())
    }
}

impl Default for CornerRadii {
    fn default() -> Self {
        Self::SM
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_radius_sizes() {
        assert_eq!(RadiusSize::Sm.to_pixels(), 4.0);
        assert_eq!(RadiusSize::Xs.to_pixels(), 2.0);
        assert_eq!(CornerRadii::default().top_left, 4.0);
    }
}
