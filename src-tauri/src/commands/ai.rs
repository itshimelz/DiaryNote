use tauri::{AppHandle, Emitter};

use crate::domain::ai::{
    AiConnectionTestResult, AiRequestConfig, AiStreamChunkPayload, AiSynthesisResult,
};
use crate::error::AppError;
use crate::infrastructure::network::AiClient;

#[tauri::command]
pub async fn ai_test_connection(
    config: AiRequestConfig,
) -> Result<AiConnectionTestResult, AppError> {
    let client = AiClient::new();
    Ok(client.test_connection(&config).await?)
}

#[tauri::command]
pub async fn ai_stream_synthesis(
    app: AppHandle,
    config: AiRequestConfig,
    request_id: String,
) -> Result<AiSynthesisResult, AppError> {
    let client = AiClient::new();
    let req_id_clone = request_id.clone();
    let app_clone = app.clone();

    let full_text = client
        .stream_completion(&config, move |chunk| {
            let payload = AiStreamChunkPayload {
                request_id: req_id_clone.clone(),
                chunk,
                is_done: false,
                error: None,
            };
            let _ = app_clone.emit("ai:stream-chunk", &payload);
        })
        .await
        .map_err(|e| {
            let error_payload = AiStreamChunkPayload {
                request_id: request_id.clone(),
                chunk: String::new(),
                is_done: true,
                error: Some(e.to_string()),
            };
            let _ = app.emit("ai:stream-chunk", &error_payload);
            AppError::Network(e.to_string())
        })?;

    // Emit final completion event
    let done_payload = AiStreamChunkPayload {
        request_id,
        chunk: String::new(),
        is_done: true,
        error: None,
    };
    let _ = app.emit("ai:stream-chunk", &done_payload);

    // Parse title if present
    let mut title = format!("Merged Note ({})", chrono::Utc::now().format("%Y-%m-%d"));
    let mut content = full_text.trim().to_string();

    if let Some(first_line) = content.lines().next() {
        if first_line.starts_with("# ") {
            title = first_line.trim_start_matches("# ").trim().to_string();
            content = content.trim_start_matches(first_line).trim().to_string();
        }
    }

    Ok(AiSynthesisResult { title, content })
}

#[tauri::command]
pub async fn ai_generate_tags(
    config: AiRequestConfig,
    title: String,
    content: String,
) -> Result<Vec<String>, AppError> {
    let client = AiClient::new();
    Ok(client.generate_tags(&config, &title, &content).await?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_request_config_serde() {
        let json_str = r#"{
            "provider": "gemini",
            "apiKey": "test-key-123",
            "modelName": "gemini-2.5-flash",
            "userPrompt": "Hello test prompt"
        }"#;

        let config: AiRequestConfig = serde_json::from_str(json_str).expect("Deserialize failed");
        assert_eq!(config.provider, "gemini");
        assert_eq!(config.api_key, "test-key-123");
        assert_eq!(config.model_name.as_deref(), Some("gemini-2.5-flash"));
    }
}
