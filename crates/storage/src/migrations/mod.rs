use crate::error::StorageResult;
use rusqlite::Connection;

pub struct MigrationRunner;

impl MigrationRunner {
    pub fn run_migrations(conn: &mut Connection) -> StorageResult<()> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS _schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );",
        )?;

        let current_version: i32 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM _schema_migrations",
            [],
            |row| row.get(0),
        )?;

        let tx = conn.transaction()?;

        if current_version < 1 {
            tx.execute_batch(
                "-- V1: Initial Core Schema
                CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '',
                    body TEXT NOT NULL DEFAULT '',
                    x REAL NOT NULL DEFAULT 0.0,
                    y REAL NOT NULL DEFAULT 0.0,
                    width REAL NOT NULL DEFAULT 280.0,
                    height REAL NOT NULL DEFAULT 200.0,
                    color_theme TEXT NOT NULL DEFAULT 'default',
                    mood TEXT NOT NULL DEFAULT 'none',
                    font_family TEXT NOT NULL DEFAULT 'sans',
                    is_locked INTEGER NOT NULL DEFAULT 0,
                    is_pinned INTEGER NOT NULL DEFAULT 0,
                    is_favorite INTEGER NOT NULL DEFAULT 0,
                    is_archived INTEGER NOT NULL DEFAULT 0,
                    is_daily_entry INTEGER NOT NULL DEFAULT 0,
                    entry_date TEXT,
                    z_index INTEGER NOT NULL DEFAULT 0,
                    group_id TEXT,
                    tags_json TEXT NOT NULL DEFAULT '[]',
                    checklist_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_notes_daily ON notes(is_daily_entry, entry_date);
                CREATE INDEX IF NOT EXISTS idx_notes_locked ON notes(is_locked);

                CREATE TABLE IF NOT EXISTS journal_entries (
                    date TEXT PRIMARY KEY,
                    note_id TEXT NOT NULL,
                    mood TEXT NOT NULL DEFAULT 'none',
                    title TEXT NOT NULL DEFAULT '',
                    word_count INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS vault_meta (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    password_hash TEXT NOT NULL,
                    salt_hex TEXT NOT NULL,
                    auto_lock_minutes INTEGER NOT NULL DEFAULT 15,
                    created_at TEXT NOT NULL
                );

                INSERT INTO _schema_migrations (version, applied_at)
                VALUES (1, datetime('now'));",
            )?;
        }

        if current_version < 2 {
            tx.execute_batch(
                "-- V2: Groups and Connection Edges
                CREATE TABLE IF NOT EXISTS group_frames (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '',
                    color TEXT NOT NULL DEFAULT '#3b82f6',
                    x REAL NOT NULL DEFAULT 0.0,
                    y REAL NOT NULL DEFAULT 0.0,
                    width REAL NOT NULL DEFAULT 400.0,
                    height REAL NOT NULL DEFAULT 300.0,
                    note_ids_json TEXT NOT NULL DEFAULT '[]'
                );

                CREATE TABLE IF NOT EXISTS connection_edges (
                    id TEXT PRIMARY KEY,
                    from_note TEXT NOT NULL,
                    to_note TEXT NOT NULL,
                    label TEXT,
                    style TEXT NOT NULL DEFAULT 'solid',
                    color TEXT NOT NULL DEFAULT '#71717a',
                    arrow_start INTEGER NOT NULL DEFAULT 0,
                    arrow_end INTEGER NOT NULL DEFAULT 1,
                    FOREIGN KEY(from_note) REFERENCES notes(id) ON DELETE CASCADE,
                    FOREIGN KEY(to_note) REFERENCES notes(id) ON DELETE CASCADE
                );

                INSERT INTO _schema_migrations (version, applied_at)
                VALUES (2, datetime('now'));",
            )?;
        }

        if current_version < 3 {
            tx.execute_batch(
                "-- V3: Full-Text Search FTS5 Engine
                CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                    id UNINDEXED,
                    title,
                    body,
                    tags,
                    tokenize = 'porter unicode61'
                );

                -- Triggers to synchronize notes with FTS5
                CREATE TRIGGER IF NOT EXISTS trg_notes_ai AFTER INSERT ON notes BEGIN
                    INSERT INTO notes_fts(id, title, body, tags)
                    VALUES (new.id, new.title, new.body, new.tags_json);
                END;

                CREATE TRIGGER IF NOT EXISTS trg_notes_au AFTER UPDATE ON notes BEGIN
                    UPDATE notes_fts SET
                        title = new.title,
                        body = new.body,
                        tags = new.tags_json
                    WHERE id = old.id;
                END;

                CREATE TRIGGER IF NOT EXISTS trg_notes_ad AFTER DELETE ON notes BEGIN
                    DELETE FROM notes_fts WHERE id = old.id;
                END;

                -- Initial FTS sync
                INSERT INTO notes_fts(id, title, body, tags)
                SELECT id, title, body, tags_json FROM notes;

                INSERT INTO _schema_migrations (version, applied_at)
                VALUES (3, datetime('now'));",
            )?;
        }

        tx.commit()?;
        Ok(())
    }
}
