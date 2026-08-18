use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CanvasTransform {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

impl Default for CanvasTransform {
    fn default() -> Self {
        Self {
            x: 300.0,
            y: 200.0,
            zoom: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_grid_type")]
    pub grid_type: String,
    #[serde(default = "default_theme_mode")]
    pub theme_mode: String,
    #[serde(default = "default_font")]
    pub default_font: String,
    #[serde(default)]
    pub snap_to_grid: bool,
    #[serde(default = "default_true")]
    pub show_connections: bool,
    #[serde(default = "default_true")]
    pub show_minimap: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub master_password_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub master_security_question: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub master_security_answer_hash: Option<String>,
    #[serde(default = "default_true")]
    pub check_for_updates_on_launch: bool,
    #[serde(default)]
    pub enable_ai_services: bool,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_api_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_iv: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_model_name: Option<String>,
}

fn default_grid_type() -> String {
    "dots".to_string()
}

fn default_theme_mode() -> String {
    "gradient".to_string()
}

fn default_font() -> String {
    "sans".to_string()
}

fn default_ai_provider() -> String {
    "gemini".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            grid_type: default_grid_type(),
            theme_mode: default_theme_mode(),
            default_font: default_font(),
            snap_to_grid: false,
            show_connections: true,
            show_minimap: true,
            master_password_hash: None,
            master_security_question: None,
            master_security_answer_hash: None,
            check_for_updates_on_launch: true,
            enable_ai_services: false,
            ai_provider: default_ai_provider(),
            encrypted_api_key: None,
            api_key_iv: None,
            custom_base_url: None,
            custom_model_name: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct LoadedAppState {
    pub notes: Vec<super::Note>,
    pub transform: CanvasTransform,
    pub settings: AppSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStats {
    pub db_path: String,
    #[ts(type = "number")]
    pub db_size_bytes: u64,
    #[ts(type = "number")]
    pub wal_size_bytes: u64,
    pub total_notes: usize,
    pub total_assets: usize,
    #[ts(type = "number")]
    pub total_assets_size_bytes: u64,
    pub is_integrity_ok: bool,
}
