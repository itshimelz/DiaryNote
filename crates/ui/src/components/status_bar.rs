//! Status bar component.
//!
//! Monochromatic bottom status bar with storage settlement status ("Saved" / "Saving..." / "Error"),
//! note count, selected note count, and theme mode toggle.

use crate::primitives::Badge;
use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Storage Save State Status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SaveStatus {
    #[default]
    Saved,
    Saving,
    Error,
}

/// Computed StatusBar Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StatusBarStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub text_color: Rgba,
    pub text_muted: Rgba,
    pub corner_radius: CornerRadii,
    pub height: f32,
    pub padding_x: f32,
}

/// Declarative StatusBar Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StatusBar {
    pub save_status: SaveStatus,
    pub storage_engine: String,
    pub total_notes: usize,
    pub selected_notes_count: usize,
    pub active_zoom: f32,
    pub theme: Option<SurfaceTheme>,
}

impl StatusBar {
    pub fn new() -> Self {
        Self {
            save_status: SaveStatus::Saved,
            storage_engine: "SQLite 3 (WAL)".into(),
            total_notes: 0,
            selected_notes_count: 0,
            active_zoom: 1.0,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn with_save_status(mut self, status: SaveStatus) -> Self {
        self.save_status = status;
        self
    }

    pub fn with_counts(mut self, total: usize, selected: usize) -> Self {
        self.total_notes = total;
        self.selected_notes_count = selected;
        self
    }

    pub fn with_zoom(mut self, zoom: f32) -> Self {
        self.active_zoom = zoom;
        self
    }

    pub fn save_badge(&self) -> Badge {
        match self.save_status {
            SaveStatus::Saved => Badge::success("Saved").with_icon(IconKind::Check),
            SaveStatus::Saving => Badge::new("Saving...").with_icon(IconKind::Loading),
            SaveStatus::Error => Badge::danger("Save Error").with_icon(IconKind::AlertTriangle),
        }
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> StatusBarStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, border, text_color, text_muted) = if theme.is_dark {
            (SLATE_900.with_alpha(0.92), SLATE_800, SLATE_300, SLATE_500)
        } else {
            (WHITE.with_alpha(0.92), SLATE_200, SLATE_700, SLATE_400)
        };

        StatusBarStyle {
            bg,
            border,
            text_color,
            text_muted,
            corner_radius,
            height: 28.0,
            padding_x: 12.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for StatusBar {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);
        let h = gpui::px(style.height);
        let px = gpui::px(style.padding_x);

        let badge = self.save_badge().with_theme(theme.clone());
        let zoom_pct = format!("{}%", (self.active_zoom * 100.0).round() as i32);
        let notes_text = if self.selected_notes_count > 0 {
            format!(
                "{} of {} selected",
                self.selected_notes_count, self.total_notes
            )
        } else {
            format!("{} notes", self.total_notes)
        };

        gpui::div()
            .flex()
            .items_center()
            .justify_between()
            .w_full()
            .h(h)
            .px(px)
            .bg(gpui::Hsla::from(style.bg))
            .border_t_1()
            .border_color(gpui::Hsla::from(style.border))
            .child(
                gpui::div()
                    .flex()
                    .items_center()
                    .gap_3()
                    .child(badge)
                    .child(
                        gpui::div()
                            .text_color(gpui::Hsla::from(style.text_muted))
                            .child(self.storage_engine),
                    ),
            )
            .child(
                gpui::div()
                    .flex()
                    .items_center()
                    .gap_3()
                    .child(
                        gpui::div()
                            .text_color(gpui::Hsla::from(style.text_muted))
                            .child(notes_text),
                    )
                    .child(
                        gpui::div()
                            .text_color(gpui::Hsla::from(style.text_color))
                            .child(zoom_pct),
                    ),
            )
    }
}

impl Default for StatusBar {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_bar_builder() {
        let sb = StatusBar::new()
            .with_save_status(SaveStatus::Saved)
            .with_counts(42, 3)
            .with_zoom(1.25);

        assert_eq!(sb.total_notes, 42);
        assert_eq!(sb.selected_notes_count, 3);
        assert_eq!(sb.save_badge().label, "Saved");

        let dark = SurfaceTheme::dark();
        let style = sb.compute_style(&dark);
        assert_eq!(style.height, 28.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
