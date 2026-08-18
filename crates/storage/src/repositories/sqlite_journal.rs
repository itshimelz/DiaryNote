use crate::db::Database;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use domain::error::{DomainError, DomainResult};
use domain::models::journal::{JournalDate, JournalEntry};
use domain::models::note::{Mood, NoteId};
use domain::repositories::JournalRepository;
use rusqlite::params;

pub struct SqliteJournalRepository {
    db: Database,
}

impl SqliteJournalRepository {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
}

#[async_trait]
impl JournalRepository for SqliteJournalRepository {
    async fn get_all_entries(&self) -> DomainResult<Vec<JournalEntry>> {
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare(
                    "SELECT date, note_id, mood, title, word_count, created_at, updated_at
                     FROM journal_entries
                     ORDER BY date DESC",
                )?;

                let rows = stmt.query_map([], |row| {
                    let date_str: String = row.get("date")?;
                    let note_id_str: String = row.get("note_id")?;
                    let mood_str: String = row.get("mood")?;
                    let title: String = row.get("title")?;
                    let word_count: usize = row.get::<_, i64>("word_count")? as usize;
                    let created_at_str: String = row.get("created_at")?;
                    let updated_at_str: String = row.get("updated_at")?;

                    let note_id = note_id_str.parse::<NoteId>().unwrap_or_default();
                    let date = JournalDate::new(date_str).unwrap_or_else(|_| JournalDate::today());

                    let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());
                    let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());

                    Ok(JournalEntry {
                        date,
                        note_id,
                        mood: match mood_str.as_str() {
                            "great" => Mood::Great,
                            "good" => Mood::Good,
                            "neutral" => Mood::Neutral,
                            "bad" => Mood::Bad,
                            "terrible" => Mood::Terrible,
                            _ => Mood::None,
                        },
                        title,
                        word_count,
                        created_at,
                        updated_at,
                    })
                })?;

                let mut entries = Vec::new();
                for r in rows {
                    entries.push(r?);
                }
                Ok(entries)
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn get_entry_by_date(&self, date: &JournalDate) -> DomainResult<Option<JournalEntry>> {
        let date_str = date.as_str().to_string();
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare(
                    "SELECT date, note_id, mood, title, word_count, created_at, updated_at
                     FROM journal_entries
                     WHERE date = ?1",
                )?;

                let mut rows = stmt.query_map([&date_str], |row| {
                    let d_str: String = row.get("date")?;
                    let note_id_str: String = row.get("note_id")?;
                    let mood_str: String = row.get("mood")?;
                    let title: String = row.get("title")?;
                    let word_count: usize = row.get::<_, i64>("word_count")? as usize;
                    let created_at_str: String = row.get("created_at")?;
                    let updated_at_str: String = row.get("updated_at")?;

                    let note_id = note_id_str.parse::<NoteId>().unwrap_or_default();
                    let d = JournalDate::new(d_str).unwrap_or_else(|_| JournalDate::today());

                    let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());
                    let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());

                    Ok(JournalEntry {
                        date: d,
                        note_id,
                        mood: match mood_str.as_str() {
                            "great" => Mood::Great,
                            "good" => Mood::Good,
                            "neutral" => Mood::Neutral,
                            "bad" => Mood::Bad,
                            "terrible" => Mood::Terrible,
                            _ => Mood::None,
                        },
                        title,
                        word_count,
                        created_at,
                        updated_at,
                    })
                })?;

                if let Some(r) = rows.next() {
                    Ok(Some(r?))
                } else {
                    Ok(None)
                }
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn save_entry(&self, entry: &JournalEntry) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                conn.execute(
                    "INSERT INTO journal_entries (date, note_id, mood, title, word_count, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                     ON CONFLICT(date) DO UPDATE SET
                        note_id = excluded.note_id,
                        mood = excluded.mood,
                        title = excluded.title,
                        word_count = excluded.word_count,
                        updated_at = excluded.updated_at;",
                    params![
                        entry.date.as_str(),
                        entry.note_id.to_string(),
                        match entry.mood {
                            Mood::Great => "great",
                            Mood::Good => "good",
                            Mood::Neutral => "neutral",
                            Mood::Bad => "bad",
                            Mood::Terrible => "terrible",
                            Mood::None => "none",
                        },
                        entry.title,
                        entry.word_count as i64,
                        entry.created_at.to_rfc3339(),
                        entry.updated_at.to_rfc3339(),
                    ],
                )?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn delete_entry(&self, date: &JournalDate) -> DomainResult<()> {
        let date_str = date.as_str().to_string();
        self.db
            .with_conn(|conn| {
                conn.execute("DELETE FROM journal_entries WHERE date = ?1", [&date_str])?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }
}
