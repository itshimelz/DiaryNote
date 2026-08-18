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
