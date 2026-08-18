//! Note card view descriptor.
//!
//! Renders note cards on the canvas with 4px corner radius, subtle shadow,
//! 9 paper themes, zero internal scrollbars, natural auto-height, selection rings,
//! rich markdown and interactive checklist parsing.

use crate::components::markdown::MarkdownView;
use crate::tokens::{
    colors::{Rgba as TokenRgba, BLUE_500},
    paper_themes::PaperThemeKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
    typography::HandFont,
};
use domain::models::note::{ChecklistItem, Mood, Note, NoteId, Point2D, Size2D};
use gpui::prelude::*;
use gpui::*;
use serde::{Deserialize, Serialize};

/// Computed NoteCard Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteCardStyle {
    pub bg: TokenRgba,
    pub border: TokenRgba,
    pub border_width: f32,
    pub text_color: TokenRgba,
    pub subtext_color: TokenRgba,
    pub selection_ring: Option<TokenRgba>,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub font_family: &'static str,
    pub min_width: f32,
    pub min_height: f32,
}

/// Declarative NoteCardView Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteCardView {
    pub id: NoteId,
    pub title: String,
    pub body: String,
    pub position: Point2D,
    pub size: Size2D,
    pub paper_theme: PaperThemeKind,
    pub font_family: HandFont,
    pub mood: Mood,
    pub is_pinned: bool,
    pub is_locked: bool,
    pub is_favorite: bool,
    pub is_daily_entry: bool,
    pub entry_date: Option<String>,
    pub is_selected: bool,
    pub is_editing: bool,
    pub tags: Vec<String>,
    pub checklist: Vec<ChecklistItem>,
}

impl NoteCardView {
    pub fn from_note(note: &Note, is_selected: bool, is_editing: bool) -> Self {
        Self {
            id: note.id,
            title: note.title.clone(),
            body: note.body.clone(),
            position: note.position,
            size: note.size,
            paper_theme: PaperThemeKind::from_name(note.color_theme.as_str()),
            font_family: HandFont::Sans,
            mood: note.mood,
            is_pinned: note.is_pinned,
            is_locked: note.is_locked,
            is_favorite: note.is_favorite,
            is_daily_entry: note.is_daily_entry,
            entry_date: note.entry_date.clone(),
            is_selected,
            is_editing,
            tags: note.tags.clone(),
            checklist: note.checklist.clone(),
        }
    }

    pub fn compute_style(&self, _theme: &SurfaceTheme) -> NoteCardStyle {
        let paper = self.paper_theme.config();
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let selection_ring = if self.is_selected {
            Some(BLUE_500)
        } else {
            None
        };

        let border_width = if self.is_selected { 2.0 } else { 1.0 };
        let shadow = if self.is_selected {
            ShadowStyle::md()
        } else {
            ShadowStyle::sm()
        };

        NoteCardStyle {
            bg: paper.bg,
            border: if self.is_selected {
                BLUE_500
            } else {
                paper.border
            },
            border_width,
            text_color: paper.text,
            subtext_color: paper.subtext,
            selection_ring,
            corner_radius,
            shadow,
            font_family: self.font_family.family_str(),
            min_width: self.size.width,
            min_height: self.size.height,
        }
    }
}

impl IntoElement for NoteCardView {
    type Element = Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let min_w = px(style.min_width);
        let min_h = px(style.min_height);

        let header = crate::components::NoteHeader::new(self.id, self.title.clone())
            .with_pinned(self.is_pinned)
            .with_locked(self.is_locked)
            .with_favorite(self.is_favorite)
            .with_mood(self.mood)
            .with_selected(self.is_selected);

        let checklist_total = self.checklist.len();
        let checklist_completed = self.checklist.iter().filter(|i| i.completed).count();
        let toolbar = crate::components::NoteToolbar::new(self.id)
            .with_checklist(checklist_completed, checklist_total)
            .with_tags(self.tags);

        let body_content = MarkdownView::new(self.body)
            .with_text_color(style.text_color);

        div()
            .flex()
            .flex_col()
            .justify_between()
            .min_w(min_w)
            .min_h(min_h)
            .rounded(px(CORNER_RADIUS_SM))
            .bg(Hsla::from(style.bg))
            .border_1()
            .border_color(Hsla::from(style.border))
            .child(header)
            .child(
                div()
                    .flex_1()
                    .p(px(12.0))
                    .child(body_content),
            )
            .child(toolbar)
    }
}

#[cfg(test)]
mod tests {
    use super::NoteCardView;
    use crate::tokens::colors::BLUE_500;
    use crate::tokens::surfaces::SurfaceTheme;
    use domain::models::note::{Note, Point2D};

    #[test]
    fn test_note_card_view() {
        let note = Note::new(
            "Rust GPUI Architecture",
            "- [x] Fully native GPU-rendered desktop client\n- [ ] Multi-card spatial dragging",
            Point2D::new(100.0, 100.0),
        );
        let view = NoteCardView::from_note(&note, true, false);

        assert_eq!(view.id, note.id);
        assert!(view.is_selected);

        let dark = SurfaceTheme::dark();
        let style = view.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.border_width, 2.0);
        assert_eq!(style.selection_ring, Some(BLUE_500));
    }
}
