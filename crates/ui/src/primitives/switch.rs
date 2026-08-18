//! Switch (toggle) primitive component.
//!
//! Monochromatic toggle switch with rounded-full pill geometry, smooth thumb translation,
//! label, and descriptive subtext.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_FULL},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Computed Switch Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SwitchStyle {
    pub track_bg: Rgba,
    pub thumb_bg: Rgba,
    pub label_color: Rgba,
    pub description_color: Rgba,
    pub corner_radius: CornerRadii,
    pub thumb_shadow: ShadowStyle,
    pub track_width: f32,
    pub track_height: f32,
    pub thumb_size: f32,
    pub thumb_offset_x: f32,
    pub opacity: f32,
}

/// Declarative Switch Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Switch {
    pub checked: bool,
    pub label: Option<String>,
    pub description: Option<String>,
    pub disabled: bool,
}

impl Switch {
    pub fn new() -> Self {
        Self {
            checked: false,
            label: None,
            description: None,
            disabled: false,
        }
    }

    pub fn with_checked(mut self, checked: bool) -> Self {
        self.checked = checked;
        self
    }

    pub fn with_label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> SwitchStyle {
        let opacity = if self.disabled { 0.5 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_FULL);

        let (track_bg, thumb_bg) = if self.checked {
            if theme.is_dark {
                (WHITE, SLATE_900)
            } else {
                (SLATE_900, WHITE)
            }
        } else if theme.is_dark {
            (SLATE_700, SLATE_300)
        } else {
            (SLATE_300, WHITE)
        };

        let label_color = if theme.is_dark { SLATE_200 } else { SLATE_800 };
        let description_color = if theme.is_dark { SLATE_400 } else { SLATE_500 };

        let track_width = 36.0;
        let track_height = 20.0;
        let thumb_size = 16.0;
        let thumb_offset_x = if self.checked { 18.0 } else { 2.0 };

        SwitchStyle {
            track_bg,
            thumb_bg,
            label_color,
            description_color,
            corner_radius,
            thumb_shadow: ShadowStyle::xs(),
            track_width,
            track_height,
            thumb_size,
            thumb_offset_x,
            opacity,
        }
    }
}

impl Default for Switch {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_switch_builder() {
        let sw = Switch::new()
            .with_label("Snap to Grid")
            .with_description("Align cards to 24px grid")
            .with_checked(true);

        assert!(sw.checked);
        assert_eq!(sw.label.as_deref(), Some("Snap to Grid"));

        let dark = SurfaceTheme::dark();
        let style = sw.compute_style(&dark);
        assert_eq!(style.thumb_offset_x, 18.0);
        assert_eq!(style.track_bg, WHITE);
    }
}
