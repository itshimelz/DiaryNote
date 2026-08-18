use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection, OptionalExtension};
use crate::domain::note::error::StorageError;
use crate::domain::note::repository::NoteRepository;
use crate::infrastructure::sqlite::db_pool::DbPool;
use crate::models::{AppSettings, CanvasTransform, LoadedAppState, Note};

/// Canonical column list for Note queries.
pub const NOTE_COLUMNS: &str = r#"
    id, title, content, x, y, width, height,
    created_at, updated_at, created_timestamp, updated_timestamp,
    font_family, font_size, paper_theme, is_pinned, z_index,
    active_mode, is_locked, group_id, group_name, entry_date,
    is_daily_entry, mood, image_url, image_type, image_aspect_ratio,
    frame_style, pin_style, rotation
"#;

/// Parses a SQLite row into a `Note` using named column lookups.
pub fn note_from_row(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    let is_pinned_int: Option<i32> = row.get("is_pinned")?;
    let is_locked_int: Option<i32> = row.get("is_locked")?;
    let is_daily_entry_int: Option<i32> = row.get("is_daily_entry")?;

    Ok(Note {
        id: row.get("id")?,
        title: row.get("title")?,
        content: row.get("content")?,
        x: row.get("x")?,
        y: row.get("y")?,
        width: row.get("width")?,
        height: row.get("height")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        created_timestamp: row.get("created_timestamp")?,
        updated_timestamp: row.get("updated_timestamp")?,
        font_family: row.get("font_family")?,
        font_size: row.get("font_size")?,
        paper_theme: row.get("paper_theme")?,
        is_pinned: is_pinned_int.map(|v| v != 0),
        z_index: row.get("z_index")?,
        tags: None,
        active_mode: row.get("active_mode")?,
        embedding: None,
        is_locked: is_locked_int.map(|v| v != 0),
        group_id: row.get("group_id")?,
        group_name: row.get("group_name")?,
        entry_date: row.get("entry_date")?,
        is_daily_entry: is_daily_entry_int.map(|v| v != 0),
        mood: row.get("mood")?,
        image_url: row.get("image_url")?,
        image_type: row.get("image_type")?,
        image_aspect_ratio: row.get("image_aspect_ratio")?,
        frame_style: row.get("frame_style")?,
        pin_style: row.get("pin_style")?,
        rotation: row.get("rotation")?,
    })
}

pub struct SqliteNoteRepository {
    pool: DbPool,
}

impl SqliteNoteRepository {
    pub fn new(conn: Connection) -> Self {
        let arc = Arc::new(Mutex::new(conn));
        Self {
            pool: DbPool::from_arcs(Arc::clone(&arc), arc),
        }
    }

    pub fn from_arc(conn: Arc<Mutex<Connection>>) -> Self {
        Self {
            pool: DbPool::from_arcs(Arc::clone(&conn), conn),
        }
    }

    pub fn from_pool(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl NoteRepository for SqliteNoteRepository {
    fn load_all(&self) -> Result<LoadedAppState, StorageError> {
        let conn = self.pool.reader().map_err(StorageError::Database)?;

        // 1. Batch Load All Note Tags (Single O(1) Pass to prevent N+1 queries)
        let mut tag_stmt = conn.prepare("SELECT note_id, tag FROM note_tags ORDER BY note_id, tag ASC")?;
        let mut tags_by_note: HashMap<String, Vec<String>> = HashMap::new();
        let tag_rows = tag_stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
        for row in tag_rows {
            let (note_id, tag) = row?;
            tags_by_note.entry(note_id).or_default().push(tag);
        }

        // 2. Load All Notes using resilient named column extractor
        let query = format!(
            "SELECT {} FROM notes ORDER BY z_index ASC, created_timestamp ASC",
            NOTE_COLUMNS
        );
        let mut note_stmt = conn.prepare(&query)?;
        let note_rows = note_stmt.query_map([], note_from_row)?;

        let mut notes = Vec::new();
        for note_res in note_rows {
            let mut note = note_res?;
            note.tags = tags_by_note.remove(&note.id);
            notes.push(note);
        }

        // 3. Load Canvas Transform
        let transform_row = conn
            .query_row("SELECT x, y, zoom FROM canvas_transform WHERE id = 'default'", [], |row| {
                Ok(CanvasTransform {
                    x: row.get::<_, f64>(0)?,
                    y: row.get::<_, f64>(1)?,
                    zoom: row.get::<_, f64>(2)?,
                })
            })
            .optional()?;

        let transform = transform_row.unwrap_or_default();

        // 4. Load App Settings
        let settings_raw: Option<String> = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = 'app_settings'",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        let settings: AppSettings = match settings_raw {
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
        let mut conn = self.pool.writer().map_err(StorageError::Database)?;
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
                delete_tags_stmt.execute((&note.id,))?;
                if let Some(ref tags) = note.tags {
                    for tag in tags {
                        insert_tag_stmt.execute((&note.id, tag))?;
                    }
                }
            }
        }

        tx.commit()?;
        Ok(notes.len())
    }

    fn delete_batch(&self, ids: &[String]) -> Result<usize, StorageError> {
        let mut conn = self.pool.writer().map_err(StorageError::Database)?;
        let tx = conn.transaction()?;
        let mut deleted_count = 0;

        {
            let mut stmt = tx.prepare("DELETE FROM notes WHERE id = ?1")?;
            for id in ids {
                let affected = stmt.execute((id,))?;
                deleted_count += affected;
            }
        }

        tx.commit()?;
        Ok(deleted_count)
    }

    fn save_canvas_transform(&self, transform: &CanvasTransform) -> Result<(), StorageError> {
        let conn = self.pool.writer().map_err(StorageError::Database)?;
        conn.execute(
            r#"
            INSERT INTO canvas_transform (id, x, y, zoom) 
            VALUES ('default', ?1, ?2, ?3)
            ON CONFLICT(id) DO UPDATE SET
                x = excluded.x,
                y = excluded.y,
                zoom = excluded.zoom
            "#,
            (transform.x, transform.y, transform.zoom),
        )?;
        Ok(())
    }

    fn save_app_settings(&self, settings: &AppSettings) -> Result<(), StorageError> {
        let conn = self.pool.writer().map_err(StorageError::Database)?;
        let json_val = serde_json::to_string(settings)?;
        conn.execute(
            r#"
            INSERT INTO app_settings (key, value) 
            VALUES ('app_settings', ?1)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value
            "#,
            (json_val,),
        )?;
        Ok(())
    }

    fn check_integrity(&self) -> Result<bool, StorageError> {
        let conn = self.pool.reader().map_err(StorageError::Database)?;
        let integrity: String = conn.query_row("PRAGMA quick_check", [], |row| row.get::<_, String>(0))?;
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
        let saved = repo.save_batch(std::slice::from_ref(&note)).expect("Failed to save batch");
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

        let settings = AppSettings {
            grid_type: "ruled".to_string(),
            ..Default::default()
        };
        repo.save_app_settings(&settings).expect("Failed to save settings");

        let reloaded = repo.load_all().expect("Failed to reload state");
        assert_eq!(reloaded.transform.x, 1000.0);
        assert_eq!(reloaded.settings.grid_type, "ruled");

        // 4. Delete Batch
        let delete_id = "n-100".to_string();
        let deleted = repo.delete_batch(std::slice::from_ref(&delete_id)).expect("Failed to delete");
        assert_eq!(deleted, 1);

        let empty_state = repo.load_all().expect("Failed to load");
        assert_eq!(empty_state.notes.len(), 0);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
