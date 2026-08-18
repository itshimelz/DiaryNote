use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::domain::note::error::StorageError;
use crate::infrastructure::sqlite::FtsEngine;
use crate::models::Note;

use ts_rs::TS;

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SearchFilter {
    pub tag: Option<String>,
    pub mood: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_daily_entry: Option<bool>,
    pub entry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SearchItemMatch {
    pub note_id: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
    pub is_vault: bool,
    pub paper_theme: String,
    pub mood: Option<String>,
    pub entry_date: Option<String>,
    pub is_daily_entry: bool,
    pub is_pinned: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SearchResultItem {
    pub total: usize,
    pub matches: Vec<SearchItemMatch>,
}

#[derive(Clone)]
pub struct SearchService {
    conn: Arc<Mutex<Connection>>,
    fts_engine: Arc<FtsEngine>,
}

impl SearchService {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self {
            conn,
            fts_engine: Arc::new(FtsEngine::new()),
        }
    }

    pub fn search_notes(
        &self,
        query: &str,
        filter: Option<SearchFilter>,
        limit: Option<usize>,
    ) -> Result<SearchResultItem, StorageError> {
        let clean_query = query.trim();
        let max_limit = limit.unwrap_or(50).min(200);

        let conn = self
            .conn
            .lock()
            .map_err(|e| StorageError::Database(format!("DB lock error: {}", e)))?;

        // 1. If query is empty, return latest notes matching filter
        if clean_query.is_empty() {
            let mut sql = String::from(
                "SELECT id, title, content, paper_theme, mood, entry_date, is_daily_entry, is_pinned, updated_at FROM notes WHERE 1=1",
            );

            if let Some(ref f) = filter {
                if let Some(ref mood) = f.mood {
                    sql.push_str(&format!(" AND mood = '{}'", mood.replace('\'', "''")));
                }
                if let Some(is_pinned) = f.is_pinned {
                    sql.push_str(&format!(" AND is_pinned = {}", if is_pinned { 1 } else { 0 }));
                }
                if let Some(is_daily) = f.is_daily_entry {
                    sql.push_str(&format!(" AND is_daily_entry = {}", if is_daily { 1 } else { 0 }));
                }
                if let Some(ref date) = f.entry_date {
                    sql.push_str(&format!(" AND entry_date = '{}'", date.replace('\'', "''")));
                }
            }

            sql.push_str(" ORDER BY updated_timestamp DESC LIMIT ?1");

            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map((max_limit as i64,), |row| {
                let id: String = row.get(0)?;
                let title: String = row.get(1)?;
                let content: String = row.get(2)?;
                let paper_theme: String = row.get(3)?;
                let mood: Option<String> = row.get(4)?;
                let entry_date: Option<String> = row.get(5)?;
                let is_daily_entry: Option<i32> = row.get(6)?;
                let is_pinned: Option<i32> = row.get(7)?;
                let updated_at: String = row.get(8)?;

                let snippet = if content.chars().count() > 120 {
                    format!("{}...", content.chars().take(120).collect::<String>())
                } else {
                    content
                };

                Ok(SearchItemMatch {
                    note_id: id,
                    title,
                    snippet,
                    rank: 0.0,
                    is_vault: false,
                    paper_theme,
                    mood,
                    entry_date,
                    is_daily_entry: is_daily_entry.unwrap_or(0) != 0,
                    is_pinned: is_pinned.unwrap_or(0) != 0,
                    updated_at,
                })
            })?;

            let mut matches = Vec::new();
            for item in rows.flatten() {
                matches.push(item);
            }

            let total = matches.len();
            return Ok(SearchResultItem { total, matches });
        }

        // 2. Query persistent disk FTS5
        let disk_results = FtsEngine::search_disk_fts(&conn, clean_query, max_limit)?;

        // 3. Query transient memory vault FTS5
        let vault_results = self.fts_engine.search_vault_fts(clean_query, max_limit)?;

        // 4. Merge results and look up note metadata
        let mut raw_matches = Vec::new();
        raw_matches.extend(disk_results);
        raw_matches.extend(vault_results);

        if raw_matches.is_empty() {
            return Ok(SearchResultItem {
                total: 0,
                matches: Vec::new(),
            });
        }

        // Fetch metadata for matched IDs
        let mut meta_stmt = conn.prepare(
            r#"
            SELECT 
                id, title, paper_theme, mood, entry_date, is_daily_entry, is_pinned, updated_at
            FROM notes 
            WHERE id = ?1
            "#,
        )?;

        let mut enriched = Vec::new();
        let mut seen_ids = HashMap::new();

        for m in raw_matches {
            if seen_ids.contains_key(&m.id) {
                continue;
            }
            seen_ids.insert(m.id.clone(), true);

            let row_opt = meta_stmt
                .query_row((&m.id,), |row| {
                    let id: String = row.get(0)?;
                    let title: String = row.get(1)?;
                    let paper_theme: String = row.get(2)?;
                    let mood: Option<String> = row.get(3)?;
                    let entry_date: Option<String> = row.get(4)?;
                    let is_daily_entry: Option<i32> = row.get(5)?;
                    let is_pinned: Option<i32> = row.get(6)?;
                    let updated_at: String = row.get(7)?;

                    Ok((
                        id,
                        title,
                        paper_theme,
                        mood,
                        entry_date,
                        is_daily_entry.unwrap_or(0) != 0,
                        is_pinned.unwrap_or(0) != 0,
                        updated_at,
                    ))
                })
                .ok();

            if let Some((
                id,
                title,
                paper_theme,
                mood,
                entry_date,
                is_daily,
                is_pinned,
                updated_at,
            )) = row_opt
            {
                // Apply filter if requested
                if let Some(ref f) = filter {
                    if let Some(ref fmood) = f.mood {
                        if mood.as_deref() != Some(fmood) {
                            continue;
                        }
                    }
                    if let Some(fpinned) = f.is_pinned {
                        if is_pinned != fpinned {
                            continue;
                        }
                    }
                    if let Some(fdaily) = f.is_daily_entry {
                        if is_daily != fdaily {
                            continue;
                        }
                    }
                    if let Some(ref fdate) = f.entry_date {
                        if entry_date.as_deref() != Some(fdate) {
                            continue;
                        }
                    }
                }

                enriched.push(SearchItemMatch {
                    note_id: id,
                    title: if title.is_empty() { m.title } else { title },
                    snippet: m.snippet,
                    rank: m.rank,
                    is_vault: m.is_vault,
                    paper_theme,
                    mood,
                    entry_date,
                    is_daily_entry: is_daily,
                    is_pinned,
                    updated_at,
                });
            }
        }

        // Sort by rank (lower BM25 rank score is more relevant in SQLite FTS5)
        enriched.sort_by(|a, b| a.rank.partial_cmp(&b.rank).unwrap_or(std::cmp::Ordering::Equal));

        let total = enriched.len();
        Ok(SearchResultItem {
            total,
            matches: enriched,
        })
    }

    pub fn index_vault_notes(&self, notes: &[Note]) -> Result<(), StorageError> {
        let payload: Vec<(String, String, String, String)> = notes
            .iter()
            .map(|n| {
                (
                    n.id.clone(),
                    n.title.clone(),
                    n.content.clone(),
                    n.tags.as_ref().map(|t| t.join(" ")).unwrap_or_default(),
                )
            })
            .collect();

        self.fts_engine
            .index_vault_notes(&payload)
            .map_err(|e| StorageError::Database(format!("Failed to index vault notes: {}", e)))
    }

    pub fn clear_vault_index(&self) {
        self.fts_engine.clear_vault_fts();
    }
}
