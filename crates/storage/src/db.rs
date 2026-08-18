use crate::error::{StorageError, StorageResult};
use crate::migrations::MigrationRunner;
use rusqlite::Connection;
use std::path::Path;
use std::sync::{Arc, Mutex};

/// Thread-safe SQLite Database manager with WAL mode and embedded migrations
#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn open_in_memory() -> StorageResult<Self> {
        let mut conn = Connection::open_in_memory()?;
        Self::configure_connection(&mut conn)?;
        MigrationRunner::run_migrations(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn open_file(path: impl AsRef<Path>) -> StorageResult<Self> {
        if let Some(parent) = path.as_ref().parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut conn = Connection::open(path)?;
        Self::configure_connection(&mut conn)?;
        MigrationRunner::run_migrations(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    fn configure_connection(conn: &mut Connection) -> StorageResult<()> {
        let _ = conn.pragma_update(None, "journal_mode", "WAL");
        let _ = conn.pragma_update(None, "synchronous", "NORMAL");
        let _ = conn.pragma_update(None, "foreign_keys", "ON");
        let _ = conn.pragma_update(None, "busy_timeout", 5000);
        Ok(())
    }

    pub fn conn(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }

    pub fn with_conn<F, T>(&self, f: F) -> StorageResult<T>
    where
        F: FnOnce(&mut Connection) -> StorageResult<T>,
    {
        let mut guard = self
            .conn
            .lock()
            .map_err(|e| StorageError::General(format!("Failed to acquire database lock: {e}")))?;
        f(&mut guard)
    }
}
