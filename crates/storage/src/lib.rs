pub mod backup;
pub mod db;
pub mod error;
pub mod migrations;
pub mod repositories;
pub mod search;

pub use backup::{BackupManager, BackupPayload, ImportStrategy, ImportSummary};
pub use db::Database;
pub use error::{StorageError, StorageResult};
pub use repositories::*;
pub use search::{FtsSearchEngine, SearchResultItem};

#[cfg(test)]
mod tests {
    use super::*;
    use crypto::VaultSession;
    use domain::models::connection::ConnectionEdge;
    use domain::models::group::GroupFrame;
    use domain::models::journal::{JournalDate, JournalEntry};
    use domain::models::note::{ChecklistItem, ColorTheme, Mood, Note, Point2D, Size2D};
    use domain::models::settings::AppSettings;
    use domain::repositories::{
        ConnectionRepository, GroupRepository, JournalRepository, NotesRepository,
        SettingsRepository,
    };
    use std::sync::{Arc, Mutex};

    #[tokio::test]
    async fn test_notes_repository_crud() {
        let db = Database::open_in_memory().unwrap();
        let repo = SqliteNotesRepository::new(db, None);

        let mut note = Note::new(
            "Rust Architecture",
            "Testing pure Rust storage layer",
            Point2D::new(100.0, 200.0),
        );
        note.color_theme = ColorTheme::Emerald;
        note.mood = Mood::Great;
        note.tags = vec!["rust".into(), "gpui".into(), "clean-arch".into()];
        note.checklist = vec![
            ChecklistItem::new("Write models", 0),
            ChecklistItem::new("Write storage", 1),
        ];

        // Save
        repo.save_note(&note).await.unwrap();

        // Get by ID
        let fetched = repo
            .get_note_by_id(&note.id)
            .await
            .unwrap()
            .expect("Note should exist");
        assert_eq!(fetched.title, "Rust Architecture");
        assert_eq!(fetched.tags.len(), 3);
        assert_eq!(fetched.checklist.len(), 2);
        assert_eq!(fetched.color_theme, ColorTheme::Emerald);
        assert_eq!(fetched.mood, Mood::Great);

        // Update position
        repo.update_positions(&[(note.id, Point2D::new(350.0, 450.0))])
            .await
            .unwrap();
        let updated = repo.get_note_by_id(&note.id).await.unwrap().unwrap();
        assert_eq!(updated.position.x, 350.0);
        assert_eq!(updated.position.y, 450.0);

        // Delete
        repo.delete_note(&note.id).await.unwrap();
        let after_delete = repo.get_note_by_id(&note.id).await.unwrap();
        assert!(after_delete.is_none());
    }

    #[tokio::test]
    async fn test_locked_notes_transparent_encryption() {
        let db = Database::open_in_memory().unwrap();
        let vault = Arc::new(Mutex::new(VaultSession::new(None)));

        // Unlock vault session
        {
            let mut v = vault.lock().unwrap();
            v.unlock("test-passcode", None, None).unwrap();
        }

        let repo = SqliteNotesRepository::new(db.clone(), Some(vault.clone()));

        let mut locked_note = Note::new(
            "Private Diary",
            "Confidential thoughts and diary entry",
            Point2D::new(0.0, 0.0),
        );
        locked_note.is_locked = true;

        repo.save_note(&locked_note).await.unwrap();

        // Inspect raw SQLite database directly: verify plaintext is NOT present
        db.with_conn(|conn| {
            let raw_body: String = conn.query_row(
                "SELECT body FROM notes WHERE id = ?1",
                [&locked_note.id.to_string()],
                |row| row.get(0),
            )?;
            assert!(!raw_body.contains("Confidential thoughts"));
            assert!(raw_body.contains("ciphertext_base64"));
            Ok(())
        })
        .unwrap();

        // Fetching through unlocked repository transparently decrypts
        let fetched = repo.get_note_by_id(&locked_note.id).await.unwrap().unwrap();
        assert_eq!(fetched.body, "Confidential thoughts and diary entry");

        // Lock the vault
        {
            let mut v = vault.lock().unwrap();
            v.lock();
        }

        // Fetching while locked leaves encrypted payload intact
        let fetched_locked = repo.get_note_by_id(&locked_note.id).await.unwrap().unwrap();
        assert!(fetched_locked.body.contains("ciphertext_base64"));
    }

    #[tokio::test]
    async fn test_fts5_full_text_search() {
        let db = Database::open_in_memory().unwrap();
        let repo = SqliteNotesRepository::new(db.clone(), None);
        let fts = FtsSearchEngine::new(db.clone());

        let note1 = Note::new(
            "Deep Neural Networks",
            "Training transformer models with attention",
            Point2D::new(0.0, 0.0),
        );
        let note2 = Note::new(
            "Cooking Recipe",
            "Delicious homemade sourdough bread",
            Point2D::new(100.0, 100.0),
        );

        repo.save_note(&note1).await.unwrap();
        repo.save_note(&note2).await.unwrap();

        let results = fts.search("transformer", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].note_id, note1.id);
        assert!(results[0].snippet.contains("transformer"));

        let results_bread = fts.search("sourdough", 10).unwrap();
        assert_eq!(results_bread.len(), 1);
        assert_eq!(results_bread[0].note_id, note2.id);
    }

    #[tokio::test]
    async fn test_journal_and_settings_repositories() {
        let db = Database::open_in_memory().unwrap();
        let notes_repo = SqliteNotesRepository::new(db.clone(), None);
        let journal_repo = SqliteJournalRepository::new(db.clone());
        let settings_repo = SqliteSettingsRepository::new(db.clone());

        // First create the backing note for the daily journal entry
        let mut note = Note::new(
            "2026-08-18 Journal",
            "Today was a productive day building in pure Rust!",
            Point2D::new(0.0, 0.0),
        );
        note.is_daily_entry = true;
        note.entry_date = Some("2026-08-18".into());
        notes_repo.save_note(&note).await.unwrap();

        let date = JournalDate::new("2026-08-18").unwrap();
        let entry = JournalEntry::new(
            date.clone(),
            note.id,
            "Day 1 in Pure Rust".into(),
            Mood::Great,
            450,
        );
        journal_repo.save_entry(&entry).await.unwrap();

        let loaded = journal_repo
            .get_entry_by_date(&date)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(loaded.title, "Day 1 in Pure Rust");
        assert_eq!(loaded.word_count, 450);

        let mut settings = AppSettings::default();
        settings.canvas.snap_to_grid = true;
        settings.canvas.grid_size = 32.0;
        settings_repo.save_settings(&settings).await.unwrap();

        let loaded_settings = settings_repo.load_settings().await.unwrap();
        assert!(loaded_settings.canvas.snap_to_grid);
        assert_eq!(loaded_settings.canvas.grid_size, 32.0);
    }

    #[tokio::test]
    async fn test_backup_export_and_staged_import() {
        let db1 = Database::open_in_memory().unwrap();
        let notes_repo1 = SqliteNotesRepository::new(db1.clone(), None);
        let groups_repo1 = SqliteGroupRepository::new(db1.clone());
        let conn_repo1 = SqliteConnectionRepository::new(db1.clone());

        let note1 = Note::new("Note Alpha", "Content Alpha", Point2D::new(10.0, 10.0));
        let note2 = Note::new("Note Beta", "Content Beta", Point2D::new(200.0, 200.0));
        notes_repo1.save_note(&note1).await.unwrap();
        notes_repo1.save_note(&note2).await.unwrap();

        let mut group = GroupFrame::new(
            "Sprint 1",
            "#3b82f6",
            Point2D::new(0.0, 0.0),
            Size2D::new_unchecked(400.0, 400.0),
        );
        group.add_note(note1.id);
        groups_repo1.save_group(&group).await.unwrap();

        let edge = ConnectionEdge::new(note1.id, note2.id);
        conn_repo1.save_connection(&edge).await.unwrap();

        let backup_mgr1 = BackupManager::new(db1);
        let backup_json = backup_mgr1.export_backup().await.unwrap();

        // Import into clean database
        let db2 = Database::open_in_memory().unwrap();
        let backup_mgr2 = BackupManager::new(db2.clone());
        let summary = backup_mgr2
            .import_backup(&backup_json, ImportStrategy::Overwrite)
            .await
            .unwrap();

        assert_eq!(summary.imported_notes, 2);
        assert_eq!(summary.imported_groups, 1);
        assert_eq!(summary.imported_connections, 1);

        // Import again with KeepBoth strategy (should duplicate with new IDs)
        let summary_dup = backup_mgr2
            .import_backup(&backup_json, ImportStrategy::KeepBoth)
            .await
            .unwrap();
        assert_eq!(summary_dup.imported_notes, 2);
        assert_eq!(summary_dup.conflicts_resolved, 2);

        let notes_repo2 = SqliteNotesRepository::new(db2, None);
        let all_notes = notes_repo2.get_all_notes().await.unwrap();
        assert_eq!(all_notes.len(), 4);
    }
}
