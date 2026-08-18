//! Action history and Undo/Redo stack for canvas and note mutations.

use crate::models::note::{Note, Point2D};
use serde::{Deserialize, Serialize};

/// Action representing a reversible canvas mutation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CanvasAction {
    CreateNote(Box<Note>),
    DeleteNote(Box<Note>),
    MoveNote {
        note_id: domain_note_id::NoteId,
        from: Point2D,
        to: Point2D,
    },
    UpdateNote {
        before: Box<Note>,
        after: Box<Note>,
    },
}

mod domain_note_id {
    pub use crate::models::note::NoteId;
}

impl CanvasAction {
    /// Invert this action to produce its inverse counterpart
    pub fn inverse(&self) -> Self {
        match self {
            Self::CreateNote(note) => Self::DeleteNote(note.clone()),
            Self::DeleteNote(note) => Self::CreateNote(note.clone()),
            Self::MoveNote { note_id, from, to } => Self::MoveNote {
                note_id: *note_id,
                from: *to,
                to: *from,
            },
            Self::UpdateNote { before, after } => Self::UpdateNote {
                before: after.clone(),
                after: before.clone(),
            },
        }
    }
}

/// Bounded undo/redo history stack
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HistoryStack {
    pub undo_stack: Vec<CanvasAction>,
    pub redo_stack: Vec<CanvasAction>,
    pub max_capacity: usize,
}

impl HistoryStack {
    pub fn new(max_capacity: usize) -> Self {
        Self {
            undo_stack: Vec::with_capacity(max_capacity),
            redo_stack: Vec::new(),
            max_capacity,
        }
    }

    pub fn push(&mut self, action: CanvasAction) {
        if self.undo_stack.len() >= self.max_capacity {
            self.undo_stack.remove(0);
        }
        self.undo_stack.push(action);
        self.redo_stack.clear();
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn pop_undo(&mut self) -> Option<CanvasAction> {
        self.undo_stack.pop()
    }

    pub fn push_redo(&mut self, action: CanvasAction) {
        self.redo_stack.push(action);
    }

    pub fn pop_redo(&mut self) -> Option<CanvasAction> {
        self.redo_stack.pop()
    }

    pub fn undo(&mut self) -> Option<CanvasAction> {
        let action = self.undo_stack.pop()?;
        self.redo_stack.push(action.clone());
        Some(action)
    }

    pub fn redo(&mut self) -> Option<CanvasAction> {
        let action = self.redo_stack.pop()?;
        self.undo_stack.push(action.clone());
        Some(action)
    }

    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }
}

impl Default for HistoryStack {
    fn default() -> Self {
        Self::new(50)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_stack() {
        let mut history = HistoryStack::new(10);
        assert!(!history.can_undo());
        assert!(!history.can_redo());

        let note = Note::new("Test", "Body", Point2D::new(0.0, 0.0));
        let action = CanvasAction::CreateNote(Box::new(note.clone()));
        history.push(action.clone());

        assert!(history.can_undo());
        assert!(!history.can_redo());

        let popped = history.undo().unwrap();
        assert_eq!(popped, action);
        assert!(!history.can_undo());
        assert!(history.can_redo());

        let redone = history.redo().unwrap();
        assert_eq!(redone, action);
        assert!(history.can_undo());
        assert!(!history.can_redo());
    }
}
