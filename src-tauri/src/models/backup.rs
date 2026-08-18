use serde::{Deserialize, Serialize};
use ts_rs::TS;
use crate::models::{AppSettings, CanvasTransform, Note};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct BackupManifest {
    pub format_version: String,
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub note_count: usize,
    pub asset_hashes: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(type = "Record<string, unknown> | null")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct VaultExportSummary {
    pub file_path: String,
    pub file_name: String,
    pub note_count: usize,
    pub asset_count: usize,
    #[ts(type = "number")]
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct VaultArchiveInspection {
    pub manifest: BackupManifest,
    pub notes: Vec<Note>,
    pub transform: Option<CanvasTransform>,
    pub settings: Option<AppSettings>,
    pub asset_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct VaultImportSummary {
    pub notes_imported: usize,
    pub notes_overwritten: usize,
    pub notes_skipped: usize,
    pub assets_imported: usize,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "kebab-case")]
pub enum ConflictResolutionMode {
    #[default]
    KeepBoth,
    Overwrite,
    Skip,
}
