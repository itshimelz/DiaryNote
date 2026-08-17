pub mod os;
pub mod sqlite;

pub use os::AppPaths;
pub use sqlite::{init_sqlite_connection, SqliteNoteRepository};
