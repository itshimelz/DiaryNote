//! Notes sidebar drawer view descriptor.
//!
//! Monochromatic list of notes with search filter, tag chips,
//! daily journal shortcut, and instant canvas focus.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use domain::models::note::NoteId;
use serde::{Deserialize, Serialize};

/// Sidebar Note Row Item Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SidebarNoteItem {
    pub id: NoteId,
    pub title: String,
    pub snippet: String,
    pub date_str: String,
    pub is_pinned: bool,
    pub is_locked: bool,
    pub is_favorite: bool,
    pub is_active: bool,
}

/// Computed Sidebar Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SidebarStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub row_bg_active: Rgba,
    pub row_bg_hover: Rgba,
    pub row_fg: Rgba,
    pub row_fg_muted: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub width: f32,
}

/// Declarative NotesSidebarView Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NotesSidebarView {
    pub is_open: bool,
    pub search_query: String,
    pub selected_tag: Option<String>,
    pub items: Vec<SidebarNoteItem>,
}

impl NotesSidebarView {
    pub fn new() -> Self {
        Self {
            is_open: false,
            search_query: String::new(),
            selected_tag: None,
            items: Vec::new(),
        }
    }

    pub fn with_items(mut self, items: Vec<SidebarNoteItem>) -> Self {
        self.items = items;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> SidebarStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, border, row_bg_active, row_bg_hover, row_fg, row_fg_muted) = if theme.is_dark {
            (
                SLATE_900, SLATE_800, SLATE_800, SLATE_850, SLATE_100, SLATE_400,
            )
        } else {
            (WHITE, SLATE_200, SLATE_100, SLATE_50, SLATE_900, SLATE_500)
        };

        SidebarStyle {
            bg,
            border,
            row_bg_active,
            row_bg_hover,
            row_fg,
            row_fg_muted,
            corner_radius,
            shadow: ShadowStyle::md(),
            width: 300.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for NotesSidebarView {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        if !self.is_open {
            return gpui::div();
        }

        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let w = gpui::px(style.width);

        let mut sidebar = gpui::div()
            .flex()
            .flex_col()
            .w(w)
            .h_full()
            .bg(gpui::Hsla::from(style.bg))
            .border_r_1()
            .border_color(gpui::Hsla::from(style.border))
            .p(gpui::px(12.0));

        let search_input = crate::primitives::Input::new("Search notes...")
            .with_value(self.search_query)
            .with_prefix_icon(crate::tokens::icons::IconKind::Search);
        sidebar = sidebar.child(search_input);

        let mut list_el = gpui::div()
            .flex()
            .flex_col()
            .gap_1()
            .mt_3()
            .overflow_hidden();
        for item in self.items {
            let (row_bg, row_fg) = if item.is_active {
                (style.row_bg_active, style.row_fg)
            } else {
                (TRANSPARENT, style.row_fg_muted)
            };

            let row = gpui::div()
                .flex()
                .flex_col()
                .p(gpui::px(8.0))
                .rounded(gpui::px(CORNER_RADIUS_SM))
                .bg(gpui::Hsla::from(row_bg))
                .text_color(gpui::Hsla::from(row_fg))
                .hover(|s| s.bg(gpui::Hsla::from(style.row_bg_hover)))
                .cursor_pointer()
                .child(
                    gpui::div()
                        .flex()
                        .items_center()
                        .justify_between()
                        .child(item.title)
                        .child(
                            gpui::div()
                                .text_color(gpui::Hsla::from(style.row_fg_muted))
                                .child(item.date_str),
                        ),
                )
                .child(
                    gpui::div()
                        .text_color(gpui::Hsla::from(style.row_fg_muted))
                        .child(item.snippet),
                );

            list_el = list_el.child(row);
        }

        sidebar.child(list_el)
    }
}

impl Default for NotesSidebarView {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sidebar_builder() {
        let sb = NotesSidebarView::new();
        assert!(!sb.is_open);

        let dark = SurfaceTheme::dark();
        let style = sb.compute_style(&dark);
        assert_eq!(style.width, 300.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
