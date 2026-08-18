//! Note header component.
//!
//! Header bar for Note cards with mood indicator, pin toggle, lock status,
//! title editing, and more action menu trigger.

use crate::tokens::{
    colors::Rgba,
    paper_themes::PaperThemeConfig,
    radius::{CornerRadii, CORNER_RADIUS_SM},
};
use domain::models::note::{Mood, NoteId};
use serde::{Deserialize, Serialize};

/// Computed NoteHeader Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteHeaderStyle {
    pub bg: Rgba,
    pub text_color: Rgba,
    pub subtext_color: Rgba,
    pub border_bottom: Option<Rgba>,
    pub corner_radius: CornerRadii,
    pub height: f32,
    pub padding_x: f32,
}

/// Declarative NoteHeader Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteHeader {
    pub note_id: NoteId,
    pub title: String,
    pub mood: Mood,
    pub is_pinned: bool,
    pub is_locked: bool,
    pub is_daily_entry: bool,
    pub entry_date: Option<String>,
    pub is_selected: bool,
}

impl NoteHeader {
    pub fn new(note_id: NoteId, title: impl Into<String>) -> Self {
        Self {
            note_id,
            title: title.into(),
            mood: Mood::None,
            is_pinned: false,
            is_locked: false,
            is_daily_entry: false,
            entry_date: None,
            is_selected: false,
        }
    }

    pub fn with_mood(mut self, mood: Mood) -> Self {
        self.mood = mood;
        self
    }

    pub fn with_pinned(mut self, pinned: bool) -> Self {
        self.is_pinned = pinned;
        self
    }

    pub fn with_locked(mut self, locked: bool) -> Self {
        self.is_locked = locked;
        self
    }

    pub fn with_daily_entry(mut self, is_daily: bool, date: Option<String>) -> Self {
        self.is_daily_entry = is_daily;
        self.entry_date = date;
        self
    }

    pub fn with_selected(mut self, selected: bool) -> Self {
        self.is_selected = selected;
        self
    }

    pub fn compute_style(&self, paper: &PaperThemeConfig) -> NoteHeaderStyle {
        NoteHeaderStyle {
            bg: paper.header_bg,
            text_color: paper.text,
            subtext_color: paper.subtext,
            border_bottom: Some(paper.divider),
            corner_radius: CornerRadii::top_only(CORNER_RADIUS_SM),
            height: 36.0,
            padding_x: 12.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokens::paper_themes::PaperThemeKind;

    #[test]
    fn test_note_header_builder() {
        let note_id = NoteId::new();
        let header = NoteHeader::new(note_id, "Project Roadmap")
            .with_pinned(true)
            .with_mood(Mood::Great);

        assert_eq!(header.title, "Project Roadmap");
        assert!(header.is_pinned);
        assert_eq!(header.mood, Mood::Great);

        let paper = PaperThemeKind::White.config();
        let style = header.compute_style(&paper);
        assert_eq!(style.height, 36.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.corner_radius.bottom_left, 0.0);
    }
}
