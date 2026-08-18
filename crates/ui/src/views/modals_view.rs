//! Desktop modals view descriptors.
//!
//! Strongly typed declarative modal windows for Security, Preferences,
//! Search (Ctrl+K), Calendar, AI Settings, and Import Preview.

use crate::primitives::dialog::DialogMaxWidth;
use serde::{Deserialize, Serialize};

/// Active Desktop Modal Type
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ActiveModal {
    Security {
        is_unlock: bool,
    },
    CanvasSettings {
        active_tab: String,
    },
    AISettings,
    Search {
        query: String,
    },
    JournalCalendar,
    DeleteConfirmation {
        note_count: usize,
    },
    ImportPreview {
        total_notes: usize,
        duplicates: usize,
    },
    About,
    Shortcuts,
}

/// Modal Configuration & Dimensions
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModalDescriptor {
    pub title: &'static str,
    pub description: Option<&'static str>,
    pub max_width: DialogMaxWidth,
}

impl ActiveModal {
    pub fn descriptor(&self) -> ModalDescriptor {
        match self {
            Self::Security { is_unlock } => ModalDescriptor {
                title: if *is_unlock {
                    "Unlock Secure Vault"
                } else {
                    "Vault Security Settings"
                },
                description: Some("Passcode is protected with Argon2id + AES-256-GCM encryption."),
                max_width: DialogMaxWidth::Lg,
            },
            Self::CanvasSettings { .. } => ModalDescriptor {
                title: "Preferences",
                description: Some("Configure canvas behaviors, storage, and visual appearance."),
                max_width: DialogMaxWidth::ThreeXl,
            },
            Self::AISettings => ModalDescriptor {
                title: "AI Feature Settings",
                description: Some("Configure LLM providers and local endpoints securely."),
                max_width: DialogMaxWidth::TwoXl,
            },
            Self::Search { .. } => ModalDescriptor {
                title: "Search Notes & Commands",
                description: Some("Type to search notes by title, body, or tags."),
                max_width: DialogMaxWidth::TwoXl,
            },
            Self::JournalCalendar => ModalDescriptor {
                title: "Daily Journal Calendar",
                description: Some("Track your daily streak and browse past entries."),
                max_width: DialogMaxWidth::Lg,
            },
            Self::DeleteConfirmation { note_count } => ModalDescriptor {
                title: "Delete Confirmation",
                description: if *note_count > 1 {
                    Some("Are you sure you want to delete these selected notes?")
                } else {
                    Some("Are you sure you want to delete this note?")
                },
                max_width: DialogMaxWidth::Sm,
            },
            Self::ImportPreview { .. } => ModalDescriptor {
                title: "Import Backup Preview",
                description: Some("Review backup contents before applying changes to database."),
                max_width: DialogMaxWidth::Xl,
            },
            Self::About => ModalDescriptor {
                title: "About DiaryNote",
                description: Some("Native GPU-accelerated pure Rust desktop application."),
                max_width: DialogMaxWidth::Lg,
            },
            Self::Shortcuts => ModalDescriptor {
                title: "Keyboard Shortcuts",
                description: Some("Desktop hotkeys and gesture cheatsheet."),
                max_width: DialogMaxWidth::TwoXl,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_modal_descriptors() {
        let modal = ActiveModal::CanvasSettings {
            active_tab: "canvas".into(),
        };
        let desc = modal.descriptor();
        assert_eq!(desc.title, "Preferences");
        assert_eq!(desc.max_width, DialogMaxWidth::ThreeXl);
    }
}
