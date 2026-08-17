use rusqlite::{Connection, OpenFlags, Result};
use std::path::Path;
use super::migrations::run_migrations;

/// Initializes a robust SQLite connection with WAL journal mode and foreign keys enabled.
pub fn init_sqlite_connection<P: AsRef<Path>>(db_path: P) -> Result<Connection> {
    let mut conn = Connection::open_with_flags(
        db_path,
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )?;

    // Configure SQLite performance and integrity pragmas
    let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |r| r.get(0))?;
    conn.pragma_update(None, "synchronous", 1)?;
    conn.pragma_update(None, "foreign_keys", true)?;
    let _: i64 = conn.query_row("PRAGMA mmap_size = 268435456", [], |r| r.get(0)).unwrap_or(0);
    let _: i64 = conn.query_row("PRAGMA cache_size = -64000", [], |r| r.get(0)).unwrap_or(0);
    let _: i64 = conn.query_row("PRAGMA temp_store = 2", [], |r| r.get(0)).unwrap_or(0);
    conn.busy_timeout(std::time::Duration::from_millis(5000))?;

    // Run schema migrations
    run_migrations(&mut conn)?;

    // Quick integrity check
    let integrity: String = conn.query_row("PRAGMA quick_check", [], |row| row.get(0))?;
    if integrity != "ok" {
        log::warn!("SQLite database quick_check warning: {}", integrity);
    }

    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_sqlite_connection_in_memory() {
        let temp_dir = std::env::temp_dir().join(format!("test_sqlite_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let db_file = temp_dir.join("test.db");

        let conn = init_sqlite_connection(&db_file).expect("Failed to open connection");
        let journal_mode: String = conn.query_row("PRAGMA journal_mode", [], |row| row.get(0)).unwrap();
        assert_eq!(journal_mode.to_lowercase(), "wal");

        let foreign_keys: i32 = conn.query_row("PRAGMA foreign_keys", [], |row| row.get(0)).unwrap();
        assert_eq!(foreign_keys, 1);

        drop(conn);
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
