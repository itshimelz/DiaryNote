//! SegmentedControl primitive component.
//!
//! Monochromatic horizontal segment toggle with 4px corner radius,
//! active card highlight, and icon support.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Segment Option Item
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SegmentOption {
    pub value: String,
    pub label: String,
    pub icon: Option<IconKind>,
    pub disabled: bool,
}

impl SegmentOption {
    pub fn new(value: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            label: label.into(),
            icon: None,
            disabled: false,
        }
    }

    pub fn with_icon(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self
    }
}

/// Computed SegmentedControl Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SegmentedControlStyle {
    pub container_bg: Rgba,
    pub container_border: Rgba,
    pub active_bg: Rgba,
    pub active_fg: Rgba,
    pub inactive_fg: Rgba,
    pub inactive_fg_hover: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub height: f32,
    pub font_size: f32,
}

/// Declarative SegmentedControl Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SegmentedControl {
    pub selected_value: String,
    pub options: Vec<SegmentOption>,
    pub full_width: bool,
}

impl SegmentedControl {
    pub fn new(selected_value: impl Into<String>) -> Self {
        Self {
            selected_value: selected_value.into(),
            options: Vec::new(),
            full_width: true,
        }
    }

    pub fn with_option(mut self, option: SegmentOption) -> Self {
        self.options.push(option);
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> SegmentedControlStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (container_bg, container_border, active_bg, active_fg, inactive_fg, inactive_fg_hover) =
            if theme.is_dark {
                (
                    SLATE_800,
                    SLATE_700.with_alpha(0.6),
                    SLATE_900,
                    SLATE_100,
                    SLATE_400,
                    SLATE_100,
                )
            } else {
                (SLATE_100, SLATE_200, WHITE, SLATE_900, SLATE_500, SLATE_900)
            };

        SegmentedControlStyle {
            container_bg,
            container_border,
            active_bg,
            active_fg,
            inactive_fg,
            inactive_fg_hover,
            corner_radius,
            shadow: ShadowStyle::two_xs(),
            height: 28.0,
            font_size: 11.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_segmented_control_builder() {
        let sc = SegmentedControl::new("system")
            .with_option(SegmentOption::new("light", "Light").with_icon(IconKind::Sun))
            .with_option(SegmentOption::new("dark", "Dark").with_icon(IconKind::Moon))
            .with_option(SegmentOption::new("system", "System"));

        assert_eq!(sc.selected_value, "system");
        assert_eq!(sc.options.len(), 3);

        let dark = SurfaceTheme::dark();
        let style = sc.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
