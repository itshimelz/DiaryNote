use crate::db::Database;
use crate::error::{StorageError, StorageResult};
use crate::repositories::{
    SqliteConnectionRepository, SqliteGroupRepository, SqliteJournalRepository,
    SqliteNotesRepository, SqliteSettingsRepository,
};
use chrono::{DateTime, Utc};
use domain::models::connection::ConnectionEdge;
use domain::models::group::GroupFrame;
use domain::models::journal::JournalEntry;
use domain::models::note::{Note, NoteId};
use domain::models::settings::AppSettings;
use domain::repositories::{
    ConnectionRepository, GroupRepository, JournalRepository, NotesRepository, SettingsRepository,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BackupPayload {
    pub version: u32,
    pub app_version: String,
    pub exported_at: DateTime<Utc>,
    pub notes: Vec<Note>,
    pub journal_entries: Vec<JournalEntry>,
    pub group_frames: Vec<GroupFrame>,
    pub connection_edges: Vec<ConnectionEdge>,
    pub settings: AppSettings,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImportStrategy {
    Overwrite,
    KeepBoth,
    SkipExisting,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct ImportSummary {
    pub imported_notes: usize,
    pub imported_journal: usize,
    pub imported_groups: usize,
    pub imported_connections: usize,
    pub conflicts_resolved: usize,
}

pub struct BackupManager {
    db: Database,
}

impl BackupManager {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Exports full workspace state as a validated JSON string
    pub async fn export_backup(&self) -> StorageResult<String> {
        let notes_repo = SqliteNotesRepository::new(self.db.clone(), None);
        let journal_repo = SqliteJournalRepository::new(self.db.clone());
        let groups_repo = SqliteGroupRepository::new(self.db.clone());
        let conn_repo = SqliteConnectionRepository::new(self.db.clone());
        let settings_repo = SqliteSettingsRepository::new(self.db.clone());

        let notes = notes_repo
            .get_all_notes()
            .await
            .map_err(StorageError::Domain)?;
        let journal_entries = journal_repo
            .get_all_entries()
            .await
            .map_err(StorageError::Domain)?;
        let group_frames = groups_repo
            .get_all_groups()
            .await
            .map_err(StorageError::Domain)?;
        let connection_edges = conn_repo
            .get_all_connections()
            .await
            .map_err(StorageError::Domain)?;
        let settings = settings_repo
            .load_settings()
            .await
            .map_err(StorageError::Domain)?;

        let payload = BackupPayload {
            version: 1,
            app_version: "0.2.0".into(),
            exported_at: Utc::now(),
            notes,
            journal_entries,
            group_frames,
            connection_edges,
            settings,
        };

        serde_json::to_string_pretty(&payload).map_err(StorageError::Serialization)
    }

    /// Imports a backup JSON string using the specified collision strategy
    pub async fn import_backup(
        &self,
        json_content: &str,
        strategy: ImportStrategy,
    ) -> StorageResult<ImportSummary> {
        let payload: BackupPayload = serde_json::from_str(json_content)
            .map_err(|e| StorageError::Backup(format!("Invalid backup JSON format: {e}")))?;

        let notes_repo = SqliteNotesRepository::new(self.db.clone(), None);
        let journal_repo = SqliteJournalRepository::new(self.db.clone());
        let groups_repo = SqliteGroupRepository::new(self.db.clone());
        let conn_repo = SqliteConnectionRepository::new(self.db.clone());

        let existing_notes = notes_repo
            .get_all_notes()
            .await
            .map_err(StorageError::Domain)?;
        let existing_ids: std::collections::HashSet<NoteId> =
            existing_notes.iter().map(|n| n.id).collect();

        let mut summary = ImportSummary::default();
        let mut id_remapping: HashMap<NoteId, NoteId> = HashMap::new();

        // 1. Process notes
        for mut note in payload.notes {
            if existing_ids.contains(&note.id) {
                match strategy {
                    ImportStrategy::SkipExisting => continue,
                    ImportStrategy::Overwrite => {
                        notes_repo
                            .save_note(&note)
                            .await
                            .map_err(StorageError::Domain)?;
                        summary.imported_notes += 1;
                        summary.conflicts_resolved += 1;
                    }
                    ImportStrategy::KeepBoth => {
                        let old_id = note.id;
                        let new_id = NoteId::new();
                        note.id = new_id;
                        note.position = note.position.offset(40.0, 40.0);
                        note.title = format!("{} (Imported)", note.title);
                        id_remapping.insert(old_id, new_id);

                        notes_repo
                            .save_note(&note)
                            .await
                            .map_err(StorageError::Domain)?;
                        summary.imported_notes += 1;
                        summary.conflicts_resolved += 1;
                    }
                }
            } else {
                notes_repo
                    .save_note(&note)
                    .await
                    .map_err(StorageError::Domain)?;
                summary.imported_notes += 1;
            }
        }

        // 2. Process journal entries
        for mut entry in payload.journal_entries {
            if let Some(new_id) = id_remapping.get(&entry.note_id) {
                entry.note_id = *new_id;
            }
            journal_repo
                .save_entry(&entry)
                .await
                .map_err(StorageError::Domain)?;
            summary.imported_journal += 1;
        }

        // 3. Process groups
        for mut group in payload.group_frames {
            group.note_ids = group
                .note_ids
                .into_iter()
                .map(|id| *id_remapping.get(&id).unwrap_or(&id))
                .collect();
            groups_repo
                .save_group(&group)
                .await
                .map_err(StorageError::Domain)?;
            summary.imported_groups += 1;
        }

        // 4. Process connections
        for mut edge in payload.connection_edges {
            if let Some(new_from) = id_remapping.get(&edge.from_note) {
                edge.from_note = *new_from;
            }
            if let Some(new_to) = id_remapping.get(&edge.to_note) {
                edge.to_note = *new_to;
            }
            conn_repo
                .save_connection(&edge)
                .await
                .map_err(StorageError::Domain)?;
            summary.imported_connections += 1;
        }

        Ok(summary)
    }
}
