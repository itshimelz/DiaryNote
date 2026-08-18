use rusqlite::Connection;
use std::sync::{Arc, Mutex, MutexGuard};

/// Managed Database Connection Pool segregating dedicated Reader and Writer connections in SQLite WAL mode.
#[derive(Clone)]
pub struct DbPool {
    writer: Arc<Mutex<Connection>>,
    reader: Arc<Mutex<Connection>>,
}

impl DbPool {
    /// Creates a new `DbPool` from raw SQLite writer and reader connections.
    pub fn new(writer: Connection, reader: Connection) -> Self {
        Self {
            writer: Arc::new(Mutex::new(writer)),
            reader: Arc::new(Mutex::new(reader)),
        }
    }

    /// Creates a `DbPool` from existing `Arc<Mutex<Connection>>` instances.
    pub fn from_arcs(writer: Arc<Mutex<Connection>>, reader: Arc<Mutex<Connection>>) -> Self {
        Self { writer, reader }
    }

    /// Acquires a lock on the dedicated Writer connection (for inserts, updates, deletes, schema migrations).
    pub fn writer(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.writer.lock().map_err(|e| format!("DbPool writer lock poisoned: {}", e))
    }

    /// Acquires a lock on the dedicated Reader connection (for fast, unblocked reads, searches, and queries).
    pub fn reader(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.reader.lock().map_err(|e| format!("DbPool reader lock poisoned: {}", e))
    }

    /// Returns a cloned `Arc<Mutex<Connection>>` handle to the writer.
    pub fn writer_arc(&self) -> Arc<Mutex<Connection>> {
        Arc::clone(&self.writer)
    }

    /// Returns a cloned `Arc<Mutex<Connection>>` handle to the reader.
    pub fn reader_arc(&self) -> Arc<Mutex<Connection>> {
        Arc::clone(&self.reader)
    }
}
