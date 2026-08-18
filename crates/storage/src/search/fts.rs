use crate::db::Database;
use crate::error::StorageResult;
use domain::models::note::NoteId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchResultItem {
    pub note_id: NoteId,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
}

pub struct FtsSearchEngine {
    db: Database,
}

impl FtsSearchEngine {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Performs an instantaneous FTS5 search with prefix matching and BM25 ranking
    pub fn search(&self, raw_query: &str, limit: usize) -> StorageResult<Vec<SearchResultItem>> {
        let trimmed = raw_query.trim();
        if trimmed.is_empty() {
            return Ok(Vec::new());
        }

        // Format terms for FTS5 prefix search: "apple pie" -> "\"apple\"* AND \"pie\"*"
        let formatted_terms: Vec<String> = trimmed
            .split_whitespace()
            .map(|term| {
                let clean: String = term.chars().filter(|c| c.is_alphanumeric()).collect();
                if clean.is_empty() {
                    String::new()
                } else {
                    format!("\"{clean}\"*")
                }
            })
            .filter(|s| !s.is_empty())
            .collect();

        if formatted_terms.is_empty() {
            return Ok(Vec::new());
        }

        let fts_query = formatted_terms.join(" AND ");

        self.db.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT fts.id, fts.title, snippet(notes_fts, -1, '<b>', '</b>', '...', 16) AS snip, bm25(notes_fts) AS rank
                 FROM notes_fts fts
                 JOIN notes n ON n.id = fts.id
                 WHERE notes_fts MATCH ?1 AND n.is_archived = 0 AND n.is_locked = 0
                 ORDER BY rank ASC
                 LIMIT ?2",
            )?;

            let rows = stmt.query_map([fts_query, (limit as i64).to_string()], |row| {
                let id_str: String = row.get(0)?;
                let title: String = row.get(1)?;
                let snippet: String = row.get(2)?;
                let rank: f64 = row.get(3)?;

                let note_id = id_str.parse::<NoteId>().unwrap_or_default();
                Ok(SearchResultItem {
                    note_id,
                    title,
                    snippet,
                    rank,
                })
            })?;

            let mut results = Vec::new();
            for r in rows {
                results.push(r?);
            }
            Ok(results)
        })
    }
}
