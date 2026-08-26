use rusqlite::{Connection, Result};
use super::schema::INITIAL_SCHEMA_SQL;

pub const CURRENT_SCHEMA_VERSION: i32 = 3;

/// Runs all pending schema migrations inside an atomic transaction.
pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    let current_version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if current_version < 1 {
        conn.execute_batch(INITIAL_SCHEMA_SQL)?;
        conn.pragma_update(None, "user_version", 1)?;
    }

    if current_version < 2 {
        let _ = conn.execute("ALTER TABLE notes ADD COLUMN is_covered INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE notes ADD COLUMN cover_style TEXT", []);
        let _ = conn.execute("ALTER TABLE notes ADD COLUMN seal_style TEXT", []);
        let _ = conn.execute("ALTER TABLE notes ADD COLUMN cover_prompt TEXT", []);
        conn.pragma_update(None, "user_version", 2)?;
    }

    if current_version < 3 {
        // Existing databases carry the unguarded notes_au trigger, which reindexed the full
        // note body on every UPDATE (including drag/resize saves). Recreate it from the
        // schema, which is idempotent (every statement is CREATE ... IF NOT EXISTS).
        conn.execute("DROP TRIGGER IF EXISTS notes_au", [])?;
        conn.execute_batch(INITIAL_SCHEMA_SQL)?;
        conn.pragma_update(None, "user_version", 3)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_execution() {
        let mut conn = Connection::open_in_memory().unwrap();
        run_migrations(&mut conn).expect("Migrations failed");

        let version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0)).unwrap();
        assert_eq!(version, CURRENT_SCHEMA_VERSION);

        // Verify tables exist
        let tables_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('notes', 'note_tags', 'assets', 'note_assets', 'app_settings', 'canvas_transform')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(tables_count, 6);
    }

    /// The FTS update trigger must fire for indexed fields only. The FTS row is cleared first,
    /// so "row came back" is the observable signal that a reindex actually ran.
    #[test]
    fn test_fts_reindex_skips_geometry_only_updates() {
        let mut conn = Connection::open_in_memory().unwrap();
        run_migrations(&mut conn).expect("Migrations failed");
        conn.execute(
            "INSERT INTO notes (id, title, content) VALUES ('n1', 'Title', 'searchable body')",
            [],
        )
        .unwrap();
        conn.execute("DELETE FROM notes_fts WHERE id = 'n1'", []).unwrap();

        let indexed_rows = |c: &Connection| -> i64 {
            c.query_row("SELECT COUNT(*) FROM notes_fts WHERE id = 'n1'", [], |r| r.get(0))
                .unwrap()
        };

        conn.execute("UPDATE notes SET x = 42.0, y = 99.0, height = 500.0 WHERE id = 'n1'", [])
            .unwrap();
        assert_eq!(indexed_rows(&conn), 0, "geometry-only save must not reindex");

        conn.execute("UPDATE notes SET content = 'new body' WHERE id = 'n1'", [])
            .unwrap();
        assert_eq!(indexed_rows(&conn), 1, "content edit must reindex");

        let indexed: String = conn
            .query_row("SELECT content FROM notes_fts WHERE id = 'n1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(indexed, "new body");
    }
}
