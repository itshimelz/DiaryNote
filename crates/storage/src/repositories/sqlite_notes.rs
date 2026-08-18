use crate::db::Database;
use crate::error::{StorageError, StorageResult};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use crypto::VaultSession;
use domain::error::{DomainError, DomainResult};
use domain::models::note::{
    ChecklistItem, ColorTheme, FontFamily, Mood, Note, NoteId, Point2D, Size2D,
};
use domain::repositories::NotesRepository;
use rusqlite::{params, Row};
use std::sync::{Arc, Mutex};

pub struct SqliteNotesRepository {
    db: Database,
    vault_session: Option<Arc<Mutex<VaultSession>>>,
}

impl SqliteNotesRepository {
    pub fn new(db: Database, vault_session: Option<Arc<Mutex<VaultSession>>>) -> Self {
        Self { db, vault_session }
    }

    fn row_to_note(&self, row: &Row<'_>) -> Result<Note, rusqlite::Error> {
        let id_str: String = row.get("id")?;
        let title: String = row.get("title")?;
        let mut body: String = row.get("body")?;
        let x: f32 = row.get("x")?;
        let y: f32 = row.get("y")?;
        let width: f32 = row.get("width")?;
        let height: f32 = row.get("height")?;
        let color_theme_str: String = row.get("color_theme")?;
        let mood_str: String = row.get("mood")?;
        let font_family_str: String = row.get("font_family")?;
        let is_locked: bool = row.get::<_, i32>("is_locked")? != 0;
        let is_pinned: bool = row.get::<_, i32>("is_pinned")? != 0;
        let is_favorite: bool = row.get::<_, i32>("is_favorite")? != 0;
        let is_archived: bool = row.get::<_, i32>("is_archived")? != 0;
        let is_daily_entry: bool = row.get::<_, i32>("is_daily_entry")? != 0;
        let entry_date: Option<String> = row.get("entry_date")?;
        let z_index: i32 = row.get("z_index")?;
        let group_id: Option<String> = row.get("group_id")?;
        let tags_json: String = row.get("tags_json")?;
        let checklist_json: String = row.get("checklist_json")?;
        let created_at_str: String = row.get("created_at")?;
        let updated_at_str: String = row.get("updated_at")?;

        let id = id_str.parse::<NoteId>().map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
        })?;

        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
        let checklist: Vec<ChecklistItem> =
            serde_json::from_str(&checklist_json).unwrap_or_default();

        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());
        let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        // Transparent decryption for locked notes if vault session is unlocked
        if is_locked && !body.is_empty() {
            if let Some(session) = &self.vault_session {
                if let Ok(mut session_guard) = session.lock() {
                    if session_guard.is_unlocked() {
                        if let Ok(decrypted) = session_guard.decrypt_text(&body) {
                            body = decrypted;
                        }
                    }
                }
            }
        }

        Ok(Note {
            id,
            title,
            body,
            position: Point2D::new(x, y),
            size: Size2D::new_unchecked(width, height),
            color_theme: ColorTheme::from_name(&color_theme_str),
            mood: match mood_str.to_lowercase().as_str() {
                "great" => Mood::Great,
                "good" => Mood::Good,
                "neutral" => Mood::Neutral,
                "bad" => Mood::Bad,
                "terrible" => Mood::Terrible,
                _ => Mood::None,
            },
            font_family: match font_family_str.to_lowercase().as_str() {
                "serif" => FontFamily::Serif,
                "mono" => FontFamily::Mono,
                "handwriting" => FontFamily::Handwriting,
                _ => FontFamily::Sans,
            },
            is_locked,
            is_pinned,
            is_favorite,
            is_archived,
            is_daily_entry,
            entry_date,
            z_index,
            group_id,
            tags,
            checklist,
            created_at,
            updated_at,
        })
    }

    fn prepare_note_body_for_save(&self, note: &Note) -> StorageResult<String> {
        if note.is_locked && !note.body.is_empty() {
            if let Some(session) = &self.vault_session {
                let mut guard = session.lock().map_err(|e| {
                    StorageError::General(format!("Failed to lock vault session: {e}"))
                })?;
                if guard.is_unlocked() {
                    return Ok(guard.encrypt_text(&note.body)?);
                }
            }
        }
        Ok(note.body.clone())
    }
}

#[async_trait]
impl NotesRepository for SqliteNotesRepository {
    async fn get_all_notes(&self) -> DomainResult<Vec<Note>> {
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare(
                    "SELECT id, title, body, x, y, width, height, color_theme, mood, font_family,
                            is_locked, is_pinned, is_favorite, is_archived, is_daily_entry, entry_date,
                            z_index, group_id, tags_json, checklist_json, created_at, updated_at
                     FROM notes
                     WHERE is_archived = 0
                     ORDER BY z_index ASC, updated_at DESC",
                )?;

                let note_iter = stmt.query_map([], |row| self.row_to_note(row))?;
                let mut notes = Vec::new();
                for note_res in note_iter {
                    notes.push(note_res?);
                }
                Ok(notes)
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn get_note_by_id(&self, id: &NoteId) -> DomainResult<Option<Note>> {
        let id_str = id.to_string();
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare(
                    "SELECT id, title, body, x, y, width, height, color_theme, mood, font_family,
                            is_locked, is_pinned, is_favorite, is_archived, is_daily_entry, entry_date,
                            z_index, group_id, tags_json, checklist_json, created_at, updated_at
                     FROM notes
                     WHERE id = ?1",
                )?;

                let mut rows = stmt.query_map([&id_str], |row| self.row_to_note(row))?;
                if let Some(first) = rows.next() {
                    Ok(Some(first?))
                } else {
                    Ok(None)
                }
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn save_note(&self, note: &Note) -> DomainResult<()> {
        let body_to_save = self
            .prepare_note_body_for_save(note)
            .map_err(|e| DomainError::Validation(e.to_string()))?;

        let tags_json = serde_json::to_string(&note.tags)
            .map_err(|e| DomainError::Serialization(e.to_string()))?;
        let checklist_json = serde_json::to_string(&note.checklist)
            .map_err(|e| DomainError::Serialization(e.to_string()))?;

        self.db
            .with_conn(|conn| {
                conn.execute(
                    "INSERT INTO notes (
                        id, title, body, x, y, width, height, color_theme, mood, font_family,
                        is_locked, is_pinned, is_favorite, is_archived, is_daily_entry, entry_date,
                        z_index, group_id, tags_json, checklist_json, created_at, updated_at
                    ) VALUES (
                        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
                        ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22
                    ) ON CONFLICT(id) DO UPDATE SET
                        title = excluded.title,
                        body = excluded.body,
                        x = excluded.x,
                        y = excluded.y,
                        width = excluded.width,
                        height = excluded.height,
                        color_theme = excluded.color_theme,
                        mood = excluded.mood,
                        font_family = excluded.font_family,
                        is_locked = excluded.is_locked,
                        is_pinned = excluded.is_pinned,
                        is_favorite = excluded.is_favorite,
                        is_archived = excluded.is_archived,
                        is_daily_entry = excluded.is_daily_entry,
                        entry_date = excluded.entry_date,
                        z_index = excluded.z_index,
                        group_id = excluded.group_id,
                        tags_json = excluded.tags_json,
                        checklist_json = excluded.checklist_json,
                        updated_at = excluded.updated_at;",
                    params![
                        note.id.to_string(),
                        note.title,
                        body_to_save,
                        note.position.x,
                        note.position.y,
                        note.size.width,
                        note.size.height,
                        note.color_theme.as_str(),
                        match note.mood {
                            Mood::Great => "great",
                            Mood::Good => "good",
                            Mood::Neutral => "neutral",
                            Mood::Bad => "bad",
                            Mood::Terrible => "terrible",
                            Mood::None => "none",
                        },
                        match note.font_family {
                            FontFamily::Serif => "serif",
                            FontFamily::Mono => "mono",
                            FontFamily::Handwriting => "handwriting",
                            FontFamily::Sans => "sans",
                        },
                        note.is_locked as i32,
                        note.is_pinned as i32,
                        note.is_favorite as i32,
                        note.is_archived as i32,
                        note.is_daily_entry as i32,
                        note.entry_date,
                        note.z_index,
                        note.group_id,
                        tags_json,
                        checklist_json,
                        note.created_at.to_rfc3339(),
                        note.updated_at.to_rfc3339(),
                    ],
                )?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn batch_save_notes(&self, notes: &[Note]) -> DomainResult<()> {
        for note in notes {
            self.save_note(note).await?;
        }
        Ok(())
    }

    async fn delete_note(&self, id: &NoteId) -> DomainResult<()> {
        let id_str = id.to_string();
        self.db
            .with_conn(|conn| {
                conn.execute("DELETE FROM notes WHERE id = ?1", [&id_str])?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn batch_delete_notes(&self, ids: &[NoteId]) -> DomainResult<()> {
        for id in ids {
            self.delete_note(id).await?;
        }
        Ok(())
    }

    async fn update_positions(&self, updates: &[(NoteId, Point2D)]) -> DomainResult<()> {
        let now = Utc::now().to_rfc3339();
        self.db
            .with_conn(|conn| {
                let tx = conn.transaction()?;
                {
                    let mut stmt = tx.prepare(
                        "UPDATE notes SET x = ?1, y = ?2, updated_at = ?3 WHERE id = ?4",
                    )?;
                    for (id, pos) in updates {
                        stmt.execute(params![pos.x, pos.y, &now, id.to_string()])?;
                    }
                }
                tx.commit()?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }
}
