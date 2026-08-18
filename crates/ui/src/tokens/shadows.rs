//! Subtle, desktop-native shadow tokens and elevation definitions.
//!
//! Standardized to small, subtle, clean shadows with zero heavy colored glows.

use super::colors::{Rgba, BLACK};
use serde::{Deserialize, Serialize};

/// Definition of a single box shadow layer
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BoxShadow {
    pub color: Rgba,
    pub offset_x: f32,
    pub offset_y: f32,
    pub blur_radius: f32,
    pub spread_radius: f32,
}

impl BoxShadow {
    pub const fn new(
        color: Rgba,
        offset_x: f32,
        offset_y: f32,
        blur_radius: f32,
        spread_radius: f32,
    ) -> Self {
        Self {
            color,
            offset_x,
            offset_y,
            blur_radius,
            spread_radius,
        }
    }
}

impl From<BoxShadow> for gpui::BoxShadow {
    fn from(s: BoxShadow) -> Self {
        gpui::BoxShadow {
            color: s.color.into(),
            offset: gpui::Point {
                x: gpui::px(s.offset_x),
                y: gpui::px(s.offset_y),
            },
            blur_radius: gpui::px(s.blur_radius),
            spread_radius: gpui::px(s.spread_radius),
        }
    }
}

/// Standardized Shadow Elevation Scale
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ShadowStyle {
    pub layers: Vec<BoxShadow>,
}

impl ShadowStyle {
    /// No shadow
    pub fn none() -> Self {
        Self { layers: Vec::new() }
    }

    /// 2XS: Micro 1px boundary shadow (e.g. kbd keys, checklist boxes, segmented active tabs)
    pub fn two_xs() -> Self {
        Self {
            layers: vec![BoxShadow::new(BLACK.with_alpha(0.05), 0.0, 1.0, 0.0, 0.0)],
        }
    }

    /// XS: Small button and card elevation (e.g. primary buttons, active pills)
    pub fn xs() -> Self {
        Self {
            layers: vec![
                BoxShadow::new(BLACK.with_alpha(0.04), 0.0, 1.0, 2.0, 0.0),
                BoxShadow::new(BLACK.with_alpha(0.02), 0.0, 0.0, 1.0, 0.0),
            ],
        }
    }

    /// SM: Standard subtle elevation (universal standard: note cards, toolbars, docked bars)
    pub fn sm() -> Self {
        Self {
            layers: vec![
                BoxShadow::new(BLACK.with_alpha(0.06), 0.0, 1.0, 3.0, 0.0),
                BoxShadow::new(BLACK.with_alpha(0.04), 0.0, 1.0, 2.0, -1.0),
            ],
        }
    }

    /// MD: Floating menus, slash command autocompletes, context menus, tooltips
    pub fn md() -> Self {
        Self {
            layers: vec![
                BoxShadow::new(BLACK.with_alpha(0.08), 0.0, 4.0, 6.0, -1.0),
                BoxShadow::new(BLACK.with_alpha(0.04), 0.0, 2.0, 4.0, -1.0),
            ],
        }
    }

    /// LG: Desktop modal dialogs and alert popups
    pub fn lg() -> Self {
        Self {
            layers: vec![
                BoxShadow::new(BLACK.with_alpha(0.12), 0.0, 10.0, 15.0, -3.0),
                BoxShadow::new(BLACK.with_alpha(0.06), 0.0, 4.0, 6.0, -2.0),
            ],
        }
    }
}

impl Default for ShadowStyle {
    fn default() -> Self {
        Self::sm()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shadow_defaults() {
        let sm = ShadowStyle::sm();
        assert_eq!(sm.layers.len(), 2);
        assert_eq!(sm.layers[0].offset_y, 1.0);
        assert_eq!(sm.layers[0].blur_radius, 3.0);
    }
}
