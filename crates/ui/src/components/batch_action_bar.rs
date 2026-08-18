//! Batch action bar component.
//!
//! Monochromatic floating bar that seamlessly docks when 2+ notes are selected,
//! providing batch alignment, styling, grouping, duplication, locking, and deletion.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Computed BatchActionBar Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BatchActionBarStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub divider: Rgba,
    pub text_color: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub height: f32,
    pub padding_x: f32,
}

/// Declarative BatchActionBar Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BatchActionBar {
    pub selected_count: usize,
    pub has_locked_notes: bool,
    pub has_grouped_notes: bool,
}

impl BatchActionBar {
    pub fn new(selected_count: usize) -> Self {
        Self {
            selected_count,
            has_locked_notes: false,
            has_grouped_notes: false,
        }
    }

    pub fn with_has_locked(mut self, has_locked: bool) -> Self {
        self.has_locked_notes = has_locked;
        self
    }

    pub fn with_has_grouped(mut self, has_grouped: bool) -> Self {
        self.has_grouped_notes = has_grouped;
        self
    }

    pub fn is_visible(&self) -> bool {
        self.selected_count >= 2
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> BatchActionBarStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, border, divider, text_color) = if theme.is_dark {
            (SLATE_900.with_alpha(0.95), SLATE_800, SLATE_800, SLATE_200)
        } else {
            (WHITE.with_alpha(0.95), SLATE_200, SLATE_200, SLATE_800)
        };

        BatchActionBarStyle {
            bg,
            border,
            divider,
            text_color,
            corner_radius,
            shadow: ShadowStyle::md(),
            height: 40.0,
            padding_x: 12.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_action_bar() {
        let bar = BatchActionBar::new(3).with_has_locked(true);
        assert!(bar.is_visible());
        assert_eq!(bar.selected_count, 3);
        assert!(bar.has_locked_notes);

        let dark = SurfaceTheme::dark();
        let style = bar.compute_style(&dark);
        assert_eq!(style.height, 40.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
