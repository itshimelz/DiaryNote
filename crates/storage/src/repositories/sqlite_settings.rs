use crate::db::Database;
use async_trait::async_trait;
use chrono::Utc;
use domain::error::{DomainError, DomainResult};
use domain::models::settings::AppSettings;
use domain::repositories::SettingsRepository;
use rusqlite::params;

pub struct SqliteSettingsRepository {
    db: Database,
}

impl SqliteSettingsRepository {
    pub const SETTINGS_KEY: &'static str = "app_settings";

    pub fn new(db: Database) -> Self {
        Self { db }
    }
}

#[async_trait]
impl SettingsRepository for SqliteSettingsRepository {
    async fn load_settings(&self) -> DomainResult<AppSettings> {
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
                let mut rows = stmt.query_map([Self::SETTINGS_KEY], |row| {
                    let json_val: String = row.get(0)?;
                    Ok(json_val)
                })?;

                if let Some(first) = rows.next() {
                    let json_str = first?;
                    let settings: AppSettings = serde_json::from_str(&json_str).unwrap_or_default();
                    Ok(settings)
                } else {
                    Ok(AppSettings::default())
                }
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn save_settings(&self, settings: &AppSettings) -> DomainResult<()> {
        let json_str = serde_json::to_string(settings)
            .map_err(|e| DomainError::Serialization(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        self.db
            .with_conn(|conn| {
                conn.execute(
                    "INSERT INTO settings (key, value, updated_at)
                     VALUES (?1, ?2, ?3)
                     ON CONFLICT(key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = excluded.updated_at;",
                    params![Self::SETTINGS_KEY, json_str, now],
                )?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }
}
