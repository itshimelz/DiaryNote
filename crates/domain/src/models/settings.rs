use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CanvasPreferences {
    pub snap_to_grid: bool,
    pub grid_size: f32,
    pub show_dot_grid: bool,
    pub zoom_sensitivity: f32,
    pub pan_sensitivity: f32,
    pub smooth_transitions: bool,
}

impl Default for CanvasPreferences {
    fn default() -> Self {
        Self {
            snap_to_grid: false,
            grid_size: 20.0,
            show_dot_grid: true,
            zoom_sensitivity: 1.0,
            pan_sensitivity: 1.0,
            smooth_transitions: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct SecuritySettings {
    pub has_passcode: bool,
    pub auto_lock_minutes: u32,
    pub mask_locked_notes: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AiPreferences {
    pub provider: String,
    pub model_name: String,
    pub api_endpoint: Option<String>,
    pub temperature: f32,
    pub enabled: bool,
}

impl Default for AiPreferences {
    fn default() -> Self {
        Self {
            provider: "ollama".into(),
            model_name: "llama3.2".into(),
            api_endpoint: Some("http://localhost:11434".into()),
            temperature: 0.7,
            enabled: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub theme_mode: ThemeMode,
    pub canvas: CanvasPreferences,
    pub security: SecuritySettings,
    pub ai: AiPreferences,
}
