use crate::error::DomainResult;
use crate::models::connection::{ConnectionEdge, EdgeId};
use crate::models::group::{GroupFrame, GroupId};
use crate::models::journal::{JournalDate, JournalEntry};
use crate::models::note::{Note, NoteId, Point2D};
use crate::models::settings::AppSettings;
use async_trait::async_trait;

#[async_trait]
pub trait NotesRepository: Send + Sync {
    async fn get_all_notes(&self) -> DomainResult<Vec<Note>>;
    async fn get_note_by_id(&self, id: &NoteId) -> DomainResult<Option<Note>>;
    async fn save_note(&self, note: &Note) -> DomainResult<()>;
    async fn batch_save_notes(&self, notes: &[Note]) -> DomainResult<()>;
    async fn delete_note(&self, id: &NoteId) -> DomainResult<()>;
    async fn batch_delete_notes(&self, ids: &[NoteId]) -> DomainResult<()>;
    async fn update_positions(&self, updates: &[(NoteId, Point2D)]) -> DomainResult<()>;
}

#[async_trait]
pub trait JournalRepository: Send + Sync {
    async fn get_all_entries(&self) -> DomainResult<Vec<JournalEntry>>;
    async fn get_entry_by_date(&self, date: &JournalDate) -> DomainResult<Option<JournalEntry>>;
    async fn save_entry(&self, entry: &JournalEntry) -> DomainResult<()>;
    async fn delete_entry(&self, date: &JournalDate) -> DomainResult<()>;
}

#[async_trait]
pub trait SettingsRepository: Send + Sync {
    async fn load_settings(&self) -> DomainResult<AppSettings>;
    async fn save_settings(&self, settings: &AppSettings) -> DomainResult<()>;
}

#[async_trait]
pub trait GroupRepository: Send + Sync {
    async fn get_all_groups(&self) -> DomainResult<Vec<GroupFrame>>;
    async fn save_group(&self, group: &GroupFrame) -> DomainResult<()>;
    async fn delete_group(&self, id: &GroupId) -> DomainResult<()>;
}

#[async_trait]
pub trait ConnectionRepository: Send + Sync {
    async fn get_all_connections(&self) -> DomainResult<Vec<ConnectionEdge>>;
    async fn save_connection(&self, edge: &ConnectionEdge) -> DomainResult<()>;
    async fn delete_connection(&self, id: &EdgeId) -> DomainResult<()>;
}
