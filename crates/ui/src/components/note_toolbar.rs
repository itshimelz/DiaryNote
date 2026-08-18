//! Note toolbar component.
//!
//! Bottom action toolbar for Note cards with checklist counter,
//! font family selector, paper theme selector, tags, and action buttons.

use crate::tokens::{
    colors::Rgba,
    paper_themes::PaperThemeConfig,
    radius::{CornerRadii, CORNER_RADIUS_SM},
};
use domain::models::note::NoteId;
use serde::{Deserialize, Serialize};

/// Computed NoteToolbar Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteToolbarStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub fg_hover: Rgba,
    pub border_top: Option<Rgba>,
    pub corner_radius: CornerRadii,
    pub height: f32,
    pub padding_x: f32,
}

/// Declarative NoteToolbar Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteToolbar {
    pub note_id: NoteId,
    pub checklist_completed: usize,
    pub checklist_total: usize,
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub is_locked: bool,
}

impl NoteToolbar {
    pub fn new(note_id: NoteId) -> Self {
        Self {
            note_id,
            checklist_completed: 0,
            checklist_total: 0,
            tags: Vec::new(),
            is_favorite: false,
            is_locked: false,
        }
    }

    pub fn with_checklist(mut self, completed: usize, total: usize) -> Self {
        self.checklist_completed = completed;
        self.checklist_total = total;
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn has_checklist(&self) -> bool {
        self.checklist_total > 0
    }

    pub fn compute_style(&self, paper: &PaperThemeConfig) -> NoteToolbarStyle {
        NoteToolbarStyle {
            bg: paper.toolbar_bg,
            fg: paper.toolbar_btn,
            fg_hover: paper.toolbar_btn_hover,
            border_top: Some(paper.divider),
            corner_radius: CornerRadii::bottom_only(CORNER_RADIUS_SM),
            height: 32.0,
            padding_x: 10.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokens::paper_themes::PaperThemeKind;

    #[test]
    fn test_note_toolbar_builder() {
        let note_id = NoteId::new();
        let tb = NoteToolbar::new(note_id)
            .with_checklist(2, 5)
            .with_tags(vec!["rust".into(), "gpui".into()]);

        assert!(tb.has_checklist());
        assert_eq!(tb.checklist_completed, 2);
        assert_eq!(tb.checklist_total, 5);
        assert_eq!(tb.tags.len(), 2);

        let paper = PaperThemeKind::White.config();
        let style = tb.compute_style(&paper);
        assert_eq!(style.height, 32.0);
        assert_eq!(style.corner_radius.bottom_left, 4.0);
        assert_eq!(style.corner_radius.top_left, 0.0);
    }
}
