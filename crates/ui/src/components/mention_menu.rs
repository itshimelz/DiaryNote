//! Mention menu (`@`) autocompletion component.
//!
//! Monochromatic popup for searching and linking notes across the canvas,
//! with 4px corner radius and subtle elevation.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use domain::models::note::NoteId;
use serde::{Deserialize, Serialize};

/// Mention Candidate Note Item
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MentionCandidate {
    pub note_id: NoteId,
    pub title: String,
    pub snippet: String,
}

/// Computed MentionMenu Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MentionMenuStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub active_bg: Rgba,
    pub active_fg: Rgba,
    pub inactive_fg: Rgba,
    pub snippet_fg: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub width: f32,
    pub item_height: f32,
}

/// Declarative MentionMenu Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MentionMenu {
    pub query: String,
    pub candidates: Vec<MentionCandidate>,
    pub selected_index: usize,
    pub position_x: f32,
    pub position_y: f32,
}

impl MentionMenu {
    pub fn new(position_x: f32, position_y: f32) -> Self {
        Self {
            query: String::new(),
            candidates: Vec::new(),
            selected_index: 0,
            position_x,
            position_y,
        }
    }

    pub fn with_candidates(mut self, candidates: Vec<MentionCandidate>) -> Self {
        self.candidates = candidates;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> MentionMenuStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, border, active_bg, active_fg, inactive_fg, snippet_fg) = if theme.is_dark {
            (SLATE_900, SLATE_800, SLATE_800, WHITE, SLATE_200, SLATE_500)
        } else {
            (WHITE, SLATE_200, SLATE_100, SLATE_900, SLATE_800, SLATE_400)
        };

        MentionMenuStyle {
            bg,
            border,
            active_bg,
            active_fg,
            inactive_fg,
            snippet_fg,
            corner_radius,
            shadow: ShadowStyle::md(),
            width: 280.0,
            item_height: 44.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for MentionMenu {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let w = gpui::px(style.width);

        let mut menu_el = gpui::div()
            .flex()
            .flex_col()
            .w(w)
            .p(gpui::px(4.0))
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border));

        for (idx, cand) in self.candidates.into_iter().enumerate() {
            let is_selected = idx == self.selected_index;
            let (bg, fg) = if is_selected {
                (style.active_bg, style.active_fg)
            } else {
                (TRANSPARENT, style.inactive_fg)
            };

            let row = gpui::div()
                .flex()
                .flex_col()
                .px(gpui::px(8.0))
                .py(gpui::px(6.0))
                .rounded(gpui::px(CORNER_RADIUS_SM))
                .bg(gpui::Hsla::from(bg))
                .text_color(gpui::Hsla::from(fg))
                .cursor_pointer()
                .child(
                    gpui::div()
                        .flex()
                        .items_center()
                        .gap_1()
                        .child("📄")
                        .child(cand.title),
                )
                .child(
                    gpui::div()
                        .text_color(gpui::Hsla::from(style.snippet_fg))
                        .child(cand.snippet),
                );

            menu_el = menu_el.child(row);
        }

        menu_el
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mention_menu() {
        let menu = MentionMenu::new(50.0, 100.0);
        assert_eq!(menu.position_x, 50.0);
        assert_eq!(menu.position_y, 100.0);

        let dark = SurfaceTheme::dark();
        let style = menu.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.width, 280.0);
    }
}
