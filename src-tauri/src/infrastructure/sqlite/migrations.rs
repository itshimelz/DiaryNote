use rusqlite::{Connection, Result};
use super::schema::INITIAL_SCHEMA_SQL;

pub const CURRENT_SCHEMA_VERSION: i32 = 1;

/// Runs all pending schema migrations inside an atomic transaction.
pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    let current_version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if current_version < CURRENT_SCHEMA_VERSION {
        conn.execute_batch(INITIAL_SCHEMA_SQL)?;
        conn.pragma_update(None, "user_version", CURRENT_SCHEMA_VERSION)?;
    }

    // Future version migrations can be added here:
    // if current_version < 2 { ... }

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
}
