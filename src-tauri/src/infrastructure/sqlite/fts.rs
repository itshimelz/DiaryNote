use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FtsSearchResult {
    pub id: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
    pub is_vault: bool,
}

pub struct FtsEngine {
    vault_conn: Mutex<Option<Connection>>,
}

impl Default for FtsEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl FtsEngine {
    pub fn new() -> Self {
        Self {
            vault_conn: Mutex::new(None),
        }
    }

    /// Cleans and sanitizes a user query string for FTS5 syntax safety.
    pub fn sanitize_query(raw_query: &str) -> String {
        let clean = raw_query.trim();
        if clean.is_empty() {
            return String::new();
        }

        // Strip characters that disrupt FTS5 syntax
        let sanitized = clean.replace('"', "\"\"").replace('*', "");
        if sanitized.trim().is_empty() {
            return String::new();
        }

        // Enclose in quotes for exact token/substring match in trigram
        format!("\"{}\"", sanitized)
    }

    /// Searches the persistent on-disk FTS5 table (`notes_fts`).
    pub fn search_disk_fts(
        conn: &Connection,
        query: &str,
        limit: usize,
    ) -> Result<Vec<FtsSearchResult>> {
        let sanitized = Self::sanitize_query(query);
        if sanitized.is_empty() {
            return Ok(Vec::new());
        }

        let mut stmt = conn.prepare(
            r#"
            SELECT 
                id, 
                title, 
                snippet(notes_fts, 2, '<mark>', '</mark>', '...', 12) AS snip,
                rank 
            FROM notes_fts 
            WHERE notes_fts MATCH ?1 
            ORDER BY rank 
            LIMIT ?2
            "#,
        )?;

        let rows = stmt.query_map((&sanitized, limit as i64), |row| {
            let id: String = row.get(0)?;
            let title: String = row.get(1)?;
            let snippet: String = row.get(2)?;
            let rank: f64 = row.get(3)?;

            Ok(FtsSearchResult {
                id,
                title,
                snippet,
                rank,
                is_vault: false,
            })
        })?;

        let mut results = Vec::new();
        for res in rows.flatten() {
            results.push(res);
        }

        Ok(results)
    }

    /// Indexes decrypted vault notes into the transient in-memory FTS5 table.
    pub fn index_vault_notes(
        &self,
        notes: &[(String, String, String, String)], // (id, title, content, tags)
    ) -> Result<()> {
        let mut vault_conn_guard = self.vault_conn.lock().unwrap();
        let conn = match *vault_conn_guard {
            Some(ref mut c) => c,
            None => {
                let c = Connection::open_in_memory()?;
                c.execute_batch(
                    r#"
                    CREATE VIRTUAL TABLE vault_notes_fts USING fts5(
                        id UNINDEXED,
                        title,
                        content,
                        tags,
                        tokenize = 'trigram'
                    );
                    "#,
                )?;
                *vault_conn_guard = Some(c);
                vault_conn_guard.as_mut().unwrap()
            }
        };

        // Clear existing vault notes
        conn.execute("DELETE FROM vault_notes_fts", [])?;

        let mut insert_stmt = conn.prepare(
            "INSERT INTO vault_notes_fts (id, title, content, tags) VALUES (?1, ?2, ?3, ?4)",
        )?;

        for (id, title, content, tags) in notes {
            insert_stmt.execute((id, title, content, tags))?;
        }

        Ok(())
    }

    /// Searches the transient in-memory vault FTS5 table if active.
    pub fn search_vault_fts(&self, query: &str, limit: usize) -> Result<Vec<FtsSearchResult>> {
        let vault_conn_guard = self.vault_conn.lock().unwrap();
        let conn = match *vault_conn_guard {
            Some(ref c) => c,
            None => return Ok(Vec::new()),
        };

        let sanitized = Self::sanitize_query(query);
        if sanitized.is_empty() {
            return Ok(Vec::new());
        }

        let mut stmt = conn.prepare(
            r#"
            SELECT 
                id, 
                title, 
                snippet(vault_notes_fts, 2, '<mark>', '</mark>', '...', 12) AS snip,
                rank 
            FROM vault_notes_fts 
            WHERE vault_notes_fts MATCH ?1 
            ORDER BY rank 
            LIMIT ?2
            "#,
        )?;

        let rows = stmt.query_map((&sanitized, limit as i64), |row| {
            let id: String = row.get(0)?;
            let title: String = row.get(1)?;
            let snippet: String = row.get(2)?;
            let rank: f64 = row.get(3)?;

            Ok(FtsSearchResult {
                id,
                title,
                snippet,
                rank,
                is_vault: true,
            })
        })?;

        let mut results = Vec::new();
        for res in rows.flatten() {
            results.push(res);
        }

        Ok(results)
    }

    /// Drops the in-memory vault FTS table and reclaims all memory.
    pub fn clear_vault_fts(&self) {
        let mut vault_conn_guard = self.vault_conn.lock().unwrap();
        *vault_conn_guard = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::schema::INITIAL_SCHEMA_SQL;

    #[test]
    fn test_disk_and_memory_fts_search() {
        let disk_conn = Connection::open_in_memory().unwrap();
        disk_conn.execute_batch(INITIAL_SCHEMA_SQL).unwrap();

        // Insert public notes
        disk_conn
            .execute(
                "INSERT INTO notes (id, title, content, is_locked) VALUES (?1, ?2, ?3, 0)",
                ("note-1", "React Architecture", "Building hybrid canvas with React and Rust."),
            )
            .unwrap();

        disk_conn
            .execute(
                "INSERT INTO notes (id, title, content, is_locked) VALUES (?1, ?2, ?3, 1)",
                ("note-locked", "Secret Plan", "$aes-gcm$ENCRYPTED_DATA"),
            )
            .unwrap();

        // 1. Search public disk FTS
        let results = FtsEngine::search_disk_fts(&disk_conn, "canvas", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "note-1");

        // Locked content is NOT searchable on disk
        let _locked_results = FtsEngine::search_disk_fts(&disk_conn, "Secret Plan", 10).unwrap();
        // Title was indexed, but content was sanitized
        let content_results = FtsEngine::search_disk_fts(&disk_conn, "ENCRYPTED_DATA", 10).unwrap();
        assert_eq!(content_results.len(), 0);

        // 2. Index decrypted secret note into transient memory FTS
        let engine = FtsEngine::new();
        let vault_entries = vec![(
            "note-locked".to_string(),
            "Secret Plan".to_string(),
            "The secret password is pineapple.".to_string(),
            "vault".to_string(),
        )];
        engine.index_vault_notes(&vault_entries).unwrap();

        let memory_results = engine.search_vault_fts("pineapple", 10).unwrap();
        assert_eq!(memory_results.len(), 1);
        assert_eq!(memory_results[0].id, "note-locked");
        assert!(memory_results[0].is_vault);

        // 3. Clear memory vault
        engine.clear_vault_fts();
        let cleared_results = engine.search_vault_fts("pineapple", 10).unwrap();
        assert_eq!(cleared_results.len(), 0);
    }
}
