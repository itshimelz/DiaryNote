//! Note header component.
//!
//! Header bar for Note cards with mood indicator, pin toggle, lock status,
//! title editing, duplicate, and delete actions.
//! Strictly zero emojis — all vector icons.

use crate::primitives::icon::Icon;
use crate::tokens::{
    colors::Rgba,
    icons::{IconKind, IconSize},
    paper_themes::PaperThemeConfig,
    radius::{CornerRadii, CORNER_RADIUS_SM},
};
use domain::models::note::{Mood, NoteId};
use gpui::prelude::*;
use gpui::*;
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
    pub is_favorite: bool,
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
            is_favorite: false,
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

    pub fn with_favorite(mut self, favorite: bool) -> Self {
        self.is_favorite = favorite;
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

impl IntoElement for NoteHeader {
    type Element = Div;

    fn into_element(self) -> Self::Element {
        let paper = crate::tokens::paper_themes::PaperThemeKind::White.config();
        let style = self.compute_style(&paper);
        let h = px(style.height);
        let padding_x = px(style.padding_x);

        let mut left = div().flex().items_center().gap_2();

        // Mood vector icon (Zero emojis)
        if self.mood != Mood::None {
            let mood_icon_kind = match self.mood {
                Mood::Great => IconKind::Smile,
                Mood::Good => IconKind::Sun,
                Mood::Neutral => IconKind::Flash,
                Mood::Bad => IconKind::Coffee,
                Mood::Terrible => IconKind::CloudRain,
                Mood::None => IconKind::Smile,
            };
            left = left.child(
                Icon::new(mood_icon_kind)
                    .with_size(IconSize::Sm)
                    .with_color(style.subtext_color),
            );
        }

        // Pinned vector icon
        if self.is_pinned {
            left = left.child(
                Icon::new(IconKind::Pin)
                    .with_size(IconSize::Sm)
                    .with_color(style.subtext_color),
            );
        }

        // Locked vector icon
        if self.is_locked {
            left = left.child(
                Icon::new(IconKind::SecurityLock)
                    .with_size(IconSize::Sm)
                    .with_color(style.subtext_color),
            );
        }

        // Title text
        left = left.child(
            div()
                .font_weight(FontWeight::BOLD)
                .text_sm()
                .text_color(Hsla::from(style.text_color))
                .child(self.title),
        );

        // Right side action icons
        let mut right = div().flex().items_center().gap_1();

        if self.is_favorite {
            right = right.child(
                Icon::new(IconKind::Star)
                    .with_size(IconSize::Sm)
                    .with_color(style.subtext_color),
            );
        }

        let mut el = div()
            .flex()
            .items_center()
            .justify_between()
            .w_full()
            .h(h)
            .px(padding_x)
            .bg(Hsla::from(style.bg))
            .child(left)
            .child(right);

        if let Some(border) = style.border_bottom {
            el = el.border_b_1().border_color(Hsla::from(border));
        }

        el
    }
}

#[cfg(test)]
mod tests {
    use super::NoteHeader;
    use crate::tokens::paper_themes::PaperThemeKind;
    use domain::models::note::{Mood, NoteId};

    #[test]
    fn test_note_header_builder() {
        let note_id = NoteId::new();
        let header = NoteHeader::new(note_id, "Project Roadmap")
            .with_pinned(true)
            .with_locked(true)
            .with_favorite(true)
            .with_mood(Mood::Great);

        assert_eq!(header.title, "Project Roadmap");
        assert!(header.is_pinned);
        assert!(header.is_locked);
        assert!(header.is_favorite);
        assert_eq!(header.mood, Mood::Great);

        let paper = PaperThemeKind::White.config();
        let style = header.compute_style(&paper);
        assert_eq!(style.height, 36.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.corner_radius.bottom_left, 0.0);
    }
}
