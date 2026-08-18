pub mod app_state;
pub mod backup;
pub mod clipboard;
pub mod image;
pub mod note;

pub use app_state::{AppSettings, CanvasTransform, DatabaseStats, LoadedAppState};
pub use backup::{
    BackupManifest, ConflictResolutionMode, VaultArchiveInspection, VaultExportSummary,
    VaultImportSummary,
};
pub use clipboard::{NotePosition, RelocatedNoteResult};
pub use image::DroppedImageData;
pub use note::Note;

#[cfg(test)]
mod tests {
    use super::*;
    use ts_rs::TS;

    #[test]
    fn export_typescript_bindings() {
        let _ = Note::export();
        let _ = CanvasTransform::export();
        let _ = AppSettings::export();
        let _ = LoadedAppState::export();
        let _ = DatabaseStats::export();
        let _ = BackupManifest::export();
        let _ = VaultExportSummary::export();
        let _ = VaultArchiveInspection::export();
        let _ = VaultImportSummary::export();
        let _ = ConflictResolutionMode::export();
        let _ = DroppedImageData::export();
        let _ = NotePosition::export();
        let _ = RelocatedNoteResult::export();
    }
}

