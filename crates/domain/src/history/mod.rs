use crate::models::note::{ColorTheme, Note, NoteId, Size2D};
use serde::{Deserialize, Serialize};

/// Discrete canvas mutation action supporting automatic inversion for Undo/Redo
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CanvasAction {
    CreateNote(Note),
    DeleteNote(Note),
    DeleteMultipleNotes(Vec<Note>),
    MoveNotes {
        note_ids: Vec<NoteId>,
        delta_x: f32,
        delta_y: f32,
    },
    ResizeNote {
        id: NoteId,
        old_size: Size2D,
        new_size: Size2D,
    },
    EditNoteContent {
        id: NoteId,
        old_title: String,
        old_body: String,
        new_title: String,
        new_body: String,
    },
    ChangeNoteTheme {
        note_ids: Vec<NoteId>,
        old_themes: Vec<ColorTheme>,
        new_theme: ColorTheme,
    },
    Batch(Vec<CanvasAction>),
}

impl CanvasAction {
    /// Inverts this action for Undo operations
    pub fn inverse(self) -> Self {
        match self {
            Self::CreateNote(note) => Self::DeleteNote(note),
            Self::DeleteNote(note) => Self::CreateNote(note),
            Self::DeleteMultipleNotes(notes) => {
                Self::Batch(notes.into_iter().map(Self::CreateNote).collect())
            }
            Self::MoveNotes {
                note_ids,
                delta_x,
                delta_y,
            } => Self::MoveNotes {
                note_ids,
                delta_x: -delta_x,
                delta_y: -delta_y,
            },
            Self::ResizeNote {
                id,
                old_size,
                new_size,
            } => Self::ResizeNote {
                id,
                old_size: new_size,
                new_size: old_size,
            },
            Self::EditNoteContent {
                id,
                old_title,
                old_body,
                new_title,
                new_body,
            } => Self::EditNoteContent {
                id,
                old_title: new_title,
                old_body: new_body,
                new_title: old_title,
                new_body: old_body,
            },
            Self::ChangeNoteTheme {
                note_ids,
                old_themes,
                new_theme,
            } => {
                if note_ids.len() == old_themes.len() {
                    let actions: Vec<CanvasAction> = note_ids
                        .into_iter()
                        .zip(old_themes)
                        .map(|(id, old_theme)| Self::ChangeNoteTheme {
                            note_ids: vec![id],
                            old_themes: vec![new_theme],
                            new_theme: old_theme,
                        })
                        .collect();
                    Self::Batch(actions)
                } else {
                    Self::ChangeNoteTheme {
                        note_ids,
                        old_themes: vec![new_theme],
                        new_theme: old_themes.first().copied().unwrap_or_default(),
                    }
                }
            }
            Self::Batch(actions) => {
                let mut inverted: Vec<CanvasAction> =
                    actions.into_iter().map(CanvasAction::inverse).collect();
                inverted.reverse();
                Self::Batch(inverted)
            }
        }
    }
}

/// Generic bounded Undo/Redo stack
#[derive(Debug, Clone)]
pub struct HistoryStack<T> {
    undo_stack: Vec<T>,
    redo_stack: Vec<T>,
    max_capacity: usize,
}

impl<T> HistoryStack<T> {
    pub const DEFAULT_CAPACITY: usize = 100;

    pub fn new(max_capacity: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_capacity: max_capacity.max(1),
        }
    }

    pub fn push(&mut self, item: T) {
        if self.undo_stack.len() >= self.max_capacity {
            self.undo_stack.remove(0);
        }
        self.undo_stack.push(item);
        self.redo_stack.clear();
    }

    pub fn pop_undo(&mut self) -> Option<T> {
        self.undo_stack.pop()
    }

    pub fn push_redo(&mut self, item: T) {
        self.redo_stack.push(item);
    }

    pub fn pop_redo(&mut self) -> Option<T> {
        self.redo_stack.pop()
    }

    pub fn push_undo_raw(&mut self, item: T) {
        self.undo_stack.push(item);
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }

    pub fn undo_count(&self) -> usize {
        self.undo_stack.len()
    }

    pub fn redo_count(&self) -> usize {
        self.redo_stack.len()
    }
}

impl<T> Default for HistoryStack<T> {
    fn default() -> Self {
        Self::new(Self::DEFAULT_CAPACITY)
    }
}
