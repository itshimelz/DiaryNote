pub mod connection;
pub mod fts;
pub mod migrations;
pub mod repository;
pub mod schema;

pub use connection::init_sqlite_connection;
pub use fts::{FtsEngine, FtsSearchResult};
pub use repository::SqliteNoteRepository;
