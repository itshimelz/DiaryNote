use std::sync::Mutex;
use rusqlite::{params, Connection, OptionalExtension};
use crate::domain::note::error::StorageError;
use crate::domain::note::repository::NoteRepository;
use crate::models::{AppSettings, CanvasTransform, LoadedAppState, Note};

pub struct SqliteNoteRepository {
    conn: Mutex<Connection>,
}

impl SqliteNoteRepository {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }
}

impl NoteRepository for SqliteNoteRepository {
    fn load_all(&self) -> Result<LoadedAppState, StorageError> {
        let conn = self.conn.lock().map_err(|e| StorageError::Database(e.to_string()))?;

        // 1. Load Notes
        let mut note_stmt = conn.prepare(
            r#"
            SELECT 
                id, title, content, x, y, width, height, 
                created_at, updated_at, created_timestamp, updated_timestamp,
                font_family, font_size, paper_theme, is_pinned, z_index,
                active_mode, is_locked, group_id, group_name, entry_date,
                is_daily_entry, mood, image_url, image_type, image_aspect_ratio,
                frame_style, pin_style, rotation
            FROM notes
            ORDER BY z_index ASC, created_timestamp ASC
            "#
        )?;

        let mut tag_stmt = conn.prepare("SELECT tag FROM note_tags WHERE note_id = ?1 ORDER BY tag ASC")?;

        let note_rows = note_stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let title: String = row.get(1)?;
            let content: String = row.get(2)?;
            let x: f64 = row.get(3)?;
            let y: f64 = row.get(4)?;
            let width: f64 = row.get(5)?;
            let height: f64 = row.get(6)?;
            let created_at: String = row.get(7)?;
            let updated_at: String = row.get(8)?;
            let created_timestamp: Option<i64> = row.get(9)?;
            let updated_timestamp: Option<i64> = row.get(10)?;
            let font_family: String = row.get(11)?;
            let font_size: String = row.get(12)?;
            let paper_theme: String = row.get(13)?;
            let is_pinned_int: Option<i32> = row.get(14)?;
            let z_index: i32 = row.get(15)?;
            let active_mode: Option<String> = row.get(16)?;
            let is_locked_int: Option<i32> = row.get(17)?;
            let group_id: Option<String> = row.get(18)?;
            let group_name: Option<String> = row.get(19)?;
            let entry_date: Option<String> = row.get(20)?;
            let is_daily_entry_int: Option<i32> = row.get(21)?;
            let mood: Option<String> = row.get(22)?;
            let image_url: Option<String> = row.get(23)?;
            let image_type: Option<String> = row.get(24)?;
            let image_aspect_ratio: Option<f64> = row.get(25)?;
            let frame_style: Option<String> = row.get(26)?;
            let pin_style: Option<String> = row.get(27)?;
            let rotation: Option<f64> = row.get(28)?;

            Ok((
                id,
                title,
                content,
                x,
                y,
                width,
                height,
                created_at,
                updated_at,
                created_timestamp,
                updated_timestamp,
                font_family,
                font_size,
                paper_theme,
                is_pinned_int.map(|v| v != 0),
                z_index,
                active_mode,
                is_locked_int.map(|v| v != 0),
                group_id,
                group_name,
                entry_date,
                is_daily_entry_int.map(|v| v != 0),
                mood,
                image_url,
                image_type,
                image_aspect_ratio,
                frame_style,
                pin_style,
                rotation,
            ))
        })?;

        let mut notes = Vec::new();
        for row in note_rows {
            let (
                id,
                title,
                content,
                x,
                y,
                width,
                height,
                created_at,
                updated_at,
                created_timestamp,
                updated_timestamp,
                font_family,
                font_size,
                paper_theme,
                is_pinned,
                z_index,
                active_mode,
                is_locked,
                group_id,
                group_name,
                entry_date,
                is_daily_entry,
                mood,
                image_url,
                image_type,
                image_aspect_ratio,
                frame_style,
                pin_style,
                rotation,
            ) = row?;

            let tags_iter = tag_stmt.query_map(params![&id], |t_row| t_row.get::<_, String>(0))?;
            let mut tags = Vec::new();
            for t in tags_iter {
                tags.push(t?);
            }

            notes.push(Note {
                id,
                title,
                content,
                x,
                y,
                width,
                height,
                created_at,
                updated_at,
                created_timestamp,
                updated_timestamp,
                font_family,
                font_size,
                paper_theme,
                is_pinned,
                z_index,
                tags: if tags.is_empty() { None } else { Some(tags) },
                active_mode,
                embedding: None,
                is_locked,
                group_id,
                group_name,
                entry_date,
                is_daily_entry,
                mood,
                image_url,
                image_type,
                image_aspect_ratio,
                frame_style,
                pin_style,
                rotation,
            });
        }

        // 2. Load Canvas Transform
        let transform_row = conn
            .query_row("SELECT x, y, zoom FROM canvas_transform WHERE id = 'default'", [], |row| {
                Ok(CanvasTransform {
                    x: row.get(0)?,
                    y: row.get(1)?,
                    zoom: row.get(2)?,
                })
            })
            .optional()?;

        let transform = transform_row.unwrap_or_default();

        // 3. Load App Settings
        let settings_raw: Option<String> = conn
            .query_row("SELECT value FROM app_settings WHERE key = 'app_settings'", [], |row| row.get(0))
            .optional()?;

        let settings = match settings_raw {
            Some(raw) => serde_json::from_str(&raw).unwrap_or_default(),
            None => AppSettings::default(),
        };

        Ok(LoadedAppState {
            notes,
            transform,
            settings,
        })
    }

    fn save_batch(&self, notes: &[Note]) -> Result<usize, StorageError> {
        let mut conn = self.conn.lock().map_err(|e| StorageError::Database(e.to_string()))?;
        let tx = conn.transaction()?;

        {
            let mut upsert_stmt = tx.prepare(
                r#"
                INSERT INTO notes (
                    id, title, content, x, y, width, height,
                    created_at, updated_at, created_timestamp, updated_timestamp,
                    font_family, font_size, paper_theme, is_pinned, z_index,
                    active_mode, is_locked, group_id, group_name, entry_date,
                    is_daily_entry, mood, image_url, image_type, image_aspect_ratio,
                    frame_style, pin_style, rotation
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                    ?8, ?9, ?10, ?11,
                    ?12, ?13, ?14, ?15, ?16,
                    ?17, ?18, ?19, ?20, ?21,
                    ?22, ?23, ?24, ?25, ?26,
                    ?27, ?28, ?29
                )
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    content = excluded.content,
                    x = excluded.x,
                    y = excluded.y,
                    width = excluded.width,
                    height = excluded.height,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    created_timestamp = excluded.created_timestamp,
                    updated_timestamp = excluded.updated_timestamp,
                    font_family = excluded.font_family,
                    font_size = excluded.font_size,
                    paper_theme = excluded.paper_theme,
                    is_pinned = excluded.is_pinned,
                    z_index = excluded.z_index,
                    active_mode = excluded.active_mode,
                    is_locked = excluded.is_locked,
                    group_id = excluded.group_id,
                    group_name = excluded.group_name,
                    entry_date = excluded.entry_date,
                    is_daily_entry = excluded.is_daily_entry,
                    mood = excluded.mood,
                    image_url = excluded.image_url,
                    image_type = excluded.image_type,
                    image_aspect_ratio = excluded.image_aspect_ratio,
                    frame_style = excluded.frame_style,
                    pin_style = excluded.pin_style,
                    rotation = excluded.rotation
                "#
            )?;

            let mut delete_tags_stmt = tx.prepare("DELETE FROM note_tags WHERE note_id = ?1")?;
            let mut insert_tag_stmt = tx.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?1, ?2)")?;

            for note in notes {
                upsert_stmt.execute(params![
                    note.id,
                    note.title,
                    note.content,
                    note.x,
                    note.y,
                    note.width,
                    note.height,
                    note.created_at,
                    note.updated_at,
                    note.created_timestamp,
                    note.updated_timestamp,
                    note.font_family,
                    note.font_size,
                    note.paper_theme,
                    note.is_pinned.map(|v| if v { 1 } else { 0 }).unwrap_or(0),
                    note.z_index,
                    note.active_mode,
                    note.is_locked.map(|v| if v { 1 } else { 0 }).unwrap_or(0),
                    note.group_id,
                    note.group_name,
                    note.entry_date,
                    note.is_daily_entry.map(|v| if v { 1 } else { 0 }).unwrap_or(0),
                    note.mood,
                    note.image_url,
                    note.image_type,
                    note.image_aspect_ratio,
                    note.frame_style,
                    note.pin_style,
                    note.rotation,
                ])?;

                // Re-create tags
                delete_tags_stmt.execute(params![&note.id])?;
                if let Some(ref tags) = note.tags {
                    for tag in tags {
                        insert_tag_stmt.execute(params![&note.id, tag])?;
                    }
                }
            }
        }

        tx.commit()?;
        Ok(notes.len())
    }

    fn delete_batch(&self, ids: &[String]) -> Result<usize, StorageError> {
        let mut conn = self.conn.lock().map_err(|e| StorageError::Database(e.to_string()))?;
        let tx = conn.transaction()?;
        let mut deleted_count = 0;

        {
            let mut stmt = tx.prepare("DELETE FROM notes WHERE id = ?1")?;
            for id in ids {
                let affected = stmt.execute(params![id])?;
                deleted_count += affected;
            }
        }

        tx.commit()?;
        Ok(deleted_count)
    }

    fn save_canvas_transform(&self, transform: &CanvasTransform) -> Result<(), StorageError> {
        let conn = self.conn.lock().map_err(|e| StorageError::Database(e.to_string()))?;
        conn.execute(
            r#"
            INSERT INTO canvas_transform (id, x, y, zoom) 
            VALUES ('default', ?1, ?2, ?3)
            ON CONFLICT(id) DO UPDATE SET
                x = excluded.x,
                y = excluded.y,
                zoom = excluded.zoom
            "#,
            params![transform.x, transform.y, transform.zoom],
        )?;
        Ok(())
    }

    fn save_app_settings(&self, settings: &AppSettings) -> Result<(), StorageError> {
        let conn = self.conn.lock().map_err(|e| StorageError::Database(e.to_string()))?;
        let json_val = serde_json::to_string(settings)?;
        conn.execute(
            r#"
            INSERT INTO app_settings (key, value) 
            VALUES ('app_settings', ?1)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value
            "#,
            params![json_val],
        )?;
        Ok(())
    }

    fn check_integrity(&self) -> Result<bool, StorageError> {
        let conn = self.conn.lock().map_err(|e| StorageError::Database(e.to_string()))?;
        let integrity: String = conn.query_row("PRAGMA quick_check", [], |row| row.get(0))?;
        Ok(integrity == "ok")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::init_sqlite_connection;

    #[test]
    fn test_sqlite_repository_full_lifecycle() {
        let temp_dir = std::env::temp_dir().join(format!("test_sqlite_repo_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let db_file = temp_dir.join("test.db");

        let conn = init_sqlite_connection(&db_file).unwrap();
        let repo = SqliteNoteRepository::new(conn);

        let note = Note {
            id: "n-100".to_string(),
            title: "Testing SQLite".to_string(),
            content: "Full-text persistence in Rust".to_string(),
            x: 50.0,
            y: 75.0,
            width: 380.0,
            height: 340.0,
            created_at: "2026-08-17T00:00:00Z".to_string(),
            updated_at: "2026-08-17T00:00:00Z".to_string(),
            created_timestamp: Some(1786924800000),
            updated_timestamp: Some(1786924800000),
            font_family: "sans".to_string(),
            font_size: "md".to_string(),
            paper_theme: "cream".to_string(),
            is_pinned: Some(true),
            z_index: 2,
            tags: Some(vec!["#rust".to_string(), "#sqlite".to_string()]),
            active_mode: Some("text".to_string()),
            embedding: None,
            is_locked: Some(false),
            group_id: None,
            group_name: None,
            entry_date: None,
            is_daily_entry: None,
            mood: None,
            image_url: None,
            image_type: None,
            image_aspect_ratio: None,
            frame_style: None,
            pin_style: None,
            rotation: None,
        };

        // 1. Save Batch
        let saved = repo.save_batch(&[note.clone()]).expect("Failed to save batch");
        assert_eq!(saved, 1);

        // 2. Load All
        let state = repo.load_all().expect("Failed to load state");
        assert_eq!(state.notes.len(), 1);
        assert_eq!(state.notes[0].title, "Testing SQLite");
        assert_eq!(state.notes[0].paper_theme, "cream");
        assert_eq!(state.notes[0].tags.as_ref().unwrap(), &vec!["#rust".to_string(), "#sqlite".to_string()]);

        // 3. Save Transform & Settings
        let transform = CanvasTransform { x: 1000.0, y: 500.0, zoom: 1.5 };
        repo.save_canvas_transform(&transform).expect("Failed to save transform");

        let mut settings = AppSettings::default();
        settings.grid_type = "ruled".to_string();
        repo.save_app_settings(&settings).expect("Failed to save settings");

        let reloaded = repo.load_all().expect("Failed to reload state");
        assert_eq!(reloaded.transform.x, 1000.0);
        assert_eq!(reloaded.settings.grid_type, "ruled");

        // 4. Delete Batch
        let deleted = repo.delete_batch(&["n-100".to_string()]).expect("Failed to delete");
        assert_eq!(deleted, 1);

        let empty_state = repo.load_all().expect("Failed to load");
        assert_eq!(empty_state.notes.len(), 0);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
