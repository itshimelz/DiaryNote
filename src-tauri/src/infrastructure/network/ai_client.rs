use std::time::Duration;
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use thiserror::Error;

use crate::domain::ai::{AiConnectionTestResult, AiRequestConfig};

#[derive(Debug, Error)]
pub enum AiError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("API error ({status}): {message}")]
    Api { status: u16, message: String },

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Streaming parse error: {0}")]
    Parse(String),
}

pub struct AiClient {
    client: reqwest::Client,
}

impl Default for AiClient {
    fn default() -> Self {
        Self::new()
    }
}

impl AiClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            // Applies to the whole streamed response; long synthesis outputs need headroom.
            .timeout(Duration::from_secs(180))
            .build()
            .unwrap_or_default();
        Self { client }
    }

    pub fn resolve_model_name(provider: &str, custom_model: Option<&str>) -> String {
        if let Some(m) = custom_model {
            if !m.trim().is_empty() {
                return m.trim().to_string();
            }
        }

        match provider.to_lowercase().as_str() {
            "gemini" => "gemini-3.7-flash".to_string(),
            "openai" => "gpt-5.5".to_string(),
            "openrouter" => "anthropic/claude-opus-5".to_string(),
            "custom" => "deepseek-v4-flash".to_string(),
            _ => "gemini-3.7-flash".to_string(),
        }
    }

    /// ponytail: name-heuristic reasoning-model detector, not a capability probe — extend the
    /// matchers if a provider ships new reasoning families.
    pub fn is_reasoning_model(provider: &str, model_name: &str) -> bool {
        let m = model_name.to_lowercase();
        match provider {
            "gemini" => m.contains("pro") || m.contains("thinking") || m.contains("2.5"),
            "openai" => {
                (m.starts_with("o") && m.chars().nth(1).is_some_and(|c| c.is_ascii_digit()))
                    || m.starts_with("gpt-5")
            }
            "openrouter" => {
                m.contains("thinking")
                    || m.contains("claude-opus")
                    || m.contains("claude-4")
                    || m.contains("o1")
                    || m.contains("o3")
                    || m.contains("-r1")
            }
            _ => false,
        }
    }

    /// Suppresses/minimizes hidden reasoning latency on models that support the knob.
    /// Gemini gets thinking fully off; OpenAI/OpenRouter get low effort.
    fn apply_reasoning_suppression(body: &mut serde_json::Value, provider: &str, model_name: &str) {
        if !Self::is_reasoning_model(provider, model_name) {
            return;
        }
        match provider {
            "gemini" => {
                body["generationConfig"] =
                    serde_json::json!({ "thinkingConfig": { "thinkingBudget": 0 } });
            }
            "openai" => {
                body["reasoning_effort"] = serde_json::json!("low");
            }
            "openrouter" => {
                body["reasoning"] = serde_json::json!({ "effort": "low" });
            }
            _ => {}
        }
    }

    fn build_headers(provider: &str, api_key: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        let provider_lower = provider.to_lowercase();
        if provider_lower == "openrouter" {
            headers.insert("HTTP-Referer", HeaderValue::from_static("https://github.com/itshimelz/DiaryNote"));
            headers.insert("X-Title", HeaderValue::from_static("DiaryNote"));
        }

        if !api_key.trim().is_empty() {
            if provider_lower == "gemini" {
                if let Ok(val) = HeaderValue::from_str(api_key.trim()) {
                    headers.insert("x-goog-api-key", val);
                }
            } else if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", api_key.trim())) {
                headers.insert("Authorization", val);
            }
        }

        headers
    }

    /// Tests connection and credentials against the AI provider.
    pub async fn test_connection(&self, config: &AiRequestConfig) -> Result<AiConnectionTestResult, AiError> {
        let provider = config.provider.to_lowercase();
        let api_key = config.api_key.trim();
        if api_key.is_empty() && provider != "custom" {
            return Ok(AiConnectionTestResult {
                success: false,
                message: "API key is missing or empty.".to_string(),
            });
        }

        let model_name = Self::resolve_model_name(&provider, config.model_name.as_deref());
        let headers = Self::build_headers(&provider, api_key);

        if provider == "gemini" {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
                model_name
            );
            let mut body = serde_json::json!({
                "contents": [{ "parts": [{ "text": "Respond with OK" }] }]
            });
            Self::apply_reasoning_suppression(&mut body, &provider, &model_name);

            let res = self
                .client
                .post(&url)
                .headers(headers)
                .json(&body)
                .timeout(Duration::from_secs(12))
                .send()
                .await?;

            if !res.status().is_success() {
                let status = res.status().as_u16();
                let err_text = res.text().await.unwrap_or_default();
                let err_msg = serde_json::from_str::<serde_json::Value>(&err_text)
                    .ok()
                    .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| format!("HTTP {} Error", status));
                return Ok(AiConnectionTestResult {
                    success: false,
                    message: err_msg,
                });
            }

            Ok(AiConnectionTestResult {
                success: true,
                message: format!("Google Gemini ({}) verified successfully!", model_name),
            })
        } else {
            let mut base_url = match provider.as_str() {
                "openrouter" => config.custom_base_url.as_deref().unwrap_or("https://openrouter.ai/api/v1"),
                "custom" => config.custom_base_url.as_deref().unwrap_or("https://api.deepseek.com"),
                _ => "https://api.openai.com/v1",
            }
            .trim_end_matches('/')
            .to_string();

            if !base_url.ends_with("/v1") && !base_url.contains("/v1") {
                base_url.push_str("/v1");
            }

            let endpoint = format!("{}/chat/completions", base_url);
            let mut body = serde_json::json!({
                "model": model_name,
                "messages": [{ "role": "user", "content": "Say OK" }],
                "max_tokens": 10
            });
            Self::apply_reasoning_suppression(&mut body, &provider, &model_name);

            let res = self
                .client
                .post(&endpoint)
                .headers(headers)
                .json(&body)
                .timeout(Duration::from_secs(12))
                .send()
                .await?;

            if !res.status().is_success() {
                let status = res.status().as_u16();
                let err_text = res.text().await.unwrap_or_default();
                let err_msg = serde_json::from_str::<serde_json::Value>(&err_text)
                    .ok()
                    .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| format!("HTTP {} Error", status));
                return Ok(AiConnectionTestResult {
                    success: false,
                    message: err_msg,
                });
            }

            Ok(AiConnectionTestResult {
                success: true,
                message: format!("{} ({}) connection successful!", config.provider.to_uppercase(), model_name),
            })
        }
    }

    /// Streams token completion chunks to the provided callback in real-time.
    pub async fn stream_completion<F>(
        &self,
        config: &AiRequestConfig,
        on_chunk: F,
    ) -> Result<String, AiError>
    where
        F: Fn(String) + Send + Sync,
    {
        let provider = config.provider.to_lowercase();
        let api_key = config.api_key.trim();
        if api_key.is_empty() && provider != "custom" {
            return Err(AiError::Auth("API key is missing or empty.".to_string()));
        }

        let model_name = Self::resolve_model_name(&provider, config.model_name.as_deref());
        let headers = Self::build_headers(&provider, api_key);
        let mut full_text = String::new();

        if provider == "gemini" {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse",
                model_name
            );

            let mut body_map = serde_json::Map::new();
            if let Some(ref sys) = config.system_prompt {
                body_map.insert(
                    "system_instruction".to_string(),
                    serde_json::json!({ "parts": [{ "text": sys }] }),
                );
            }
            body_map.insert(
                "contents".to_string(),
                serde_json::json!([{ "parts": [{ "text": config.user_prompt }] }]),
            );

            let mut body = serde_json::Value::Object(body_map);
            Self::apply_reasoning_suppression(&mut body, &provider, &model_name);

            let res = self
                .client
                .post(&url)
                .headers(headers)
                .json(&body)
                .send()
                .await?;

            if !res.status().is_success() {
                let status = res.status().as_u16();
                let err_text = res.text().await.unwrap_or_default();
                let err_msg = serde_json::from_str::<serde_json::Value>(&err_text)
                    .ok()
                    .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| format!("HTTP {} Error", status));
                return Err(AiError::Api {
                    status,
                    message: err_msg,
                });
            }

            let mut stream = res.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk_res) = stream.next().await {
                let chunk_bytes = chunk_res?;
                buffer.push_str(&String::from_utf8_lossy(&chunk_bytes));

                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if line.starts_with("data: ") {
                        let data_str = line.trim_start_matches("data: ").trim();
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(data_str) {
                            if let Some(text) = val["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                                full_text.push_str(text);
                                on_chunk(text.to_string());
                            }
                        }
                    }
                }
            }
        } else {
            let mut base_url = match provider.as_str() {
                "openrouter" => config.custom_base_url.as_deref().unwrap_or("https://openrouter.ai/api/v1"),
                "custom" => config.custom_base_url.as_deref().unwrap_or("https://api.deepseek.com"),
                _ => "https://api.openai.com/v1",
            }
            .trim_end_matches('/')
            .to_string();

            if !base_url.ends_with("/v1") && !base_url.contains("/v1") && provider != "custom" {
                base_url.push_str("/v1");
            }

            let endpoint = format!("{}/chat/completions", base_url);

            let mut messages = Vec::new();
            if let Some(ref sys) = config.system_prompt {
                messages.push(serde_json::json!({ "role": "system", "content": sys }));
            }
            messages.push(serde_json::json!({ "role": "user", "content": config.user_prompt }));

            let mut body = serde_json::json!({
                "model": model_name,
                "messages": messages,
                "stream": true,
                "temperature": config.temperature.unwrap_or(0.3),
                "max_tokens": config.max_tokens
            });
            Self::apply_reasoning_suppression(&mut body, &provider, &model_name);

            let res = self
                .client
                .post(&endpoint)
                .headers(headers)
                .json(&body)
                .send()
                .await?;

            if !res.status().is_success() {
                let status = res.status().as_u16();
                let err_text = res.text().await.unwrap_or_default();
                let err_msg = serde_json::from_str::<serde_json::Value>(&err_text)
                    .ok()
                    .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| format!("HTTP {} Error", status));
                return Err(AiError::Api {
                    status,
                    message: err_msg,
                });
            }

            let mut stream = res.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk_res) = stream.next().await {
                let chunk_bytes = chunk_res?;
                buffer.push_str(&String::from_utf8_lossy(&chunk_bytes));

                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if line.starts_with("data: ") {
                        let data_str = line.trim_start_matches("data: ").trim();
                        if data_str == "[DONE]" {
                            break;
                        }
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(data_str) {
                            if let Some(text) = val["choices"][0]["delta"]["content"].as_str() {
                                full_text.push_str(text);
                                on_chunk(text.to_string());
                            }
                        }
                    }
                }
            }
        }

        Ok(full_text)
    }

    /// Generates tags for note title and content using the AI client.
    pub async fn generate_tags(
        &self,
        config: &AiRequestConfig,
        title: &str,
        content: &str,
    ) -> Result<Vec<String>, AiError> {
        let system_prompt = "You are an intelligent tagging assistant. Respond with ONLY 1 to 3 concise hashtags for the given note, separated by spaces. Example: #productivity #ideas #design".to_string();
        let user_prompt = format!("Note Title: {}\nNote Content: {}", title, content);

        let mut tag_config = config.clone();
        tag_config.system_prompt = Some(system_prompt);
        tag_config.user_prompt = user_prompt;
        tag_config.max_tokens = Some(40);
        tag_config.temperature = Some(0.2);

        let output = self.stream_completion(&tag_config, |_| {}).await?;

        let mut tags = Vec::new();
        for word in output.split_whitespace() {
            let clean = word.trim().trim_matches(|c: char| !c.is_alphanumeric() && c != '#' && c != '-' && c != '_');
            if !clean.is_empty() {
                let formatted = if clean.starts_with('#') {
                    clean.to_string()
                } else {
                    format!("#{}", clean)
                };
                if !tags.contains(&formatted) {
                    tags.push(formatted);
                }
            }
            if tags.len() >= 3 {
                break;
            }
        }

        Ok(tags)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_model_name_defaults() {
        assert_eq!(AiClient::resolve_model_name("gemini", None), "gemini-3.7-flash");
        assert_eq!(AiClient::resolve_model_name("openai", None), "gpt-5.5");
        assert_eq!(AiClient::resolve_model_name("openrouter", None), "anthropic/claude-opus-5");
        assert_eq!(AiClient::resolve_model_name("custom", None), "deepseek-v4-flash");

        // Custom override takes priority
        assert_eq!(
            AiClient::resolve_model_name("openai", Some("gpt-4.5-preview")),
            "gpt-4.5-preview"
        );
    }

    #[test]
    fn test_reasoning_model_detection() {
        // gemini: pro/thinking/2.5+ flagged, flash not
        assert!(AiClient::is_reasoning_model("gemini", "gemini-3.1-pro-preview"));
        assert!(AiClient::is_reasoning_model("gemini", "gemini-2.5-flash"));
        assert!(!AiClient::is_reasoning_model("gemini", "gemini-3.7-flash"));

        // openai: o-series and gpt-5 family
        assert!(AiClient::is_reasoning_model("openai", "o3-mini"));
        assert!(AiClient::is_reasoning_model("openai", "gpt-5.5-pro"));
        assert!(!AiClient::is_reasoning_model("openai", "gpt-4o-mini"));
        assert!(!AiClient::is_reasoning_model("openai", "text-embedding-3-small"));

        // openrouter reasoning families (vendor-prefixed ids)
        assert!(AiClient::is_reasoning_model(
            "openrouter",
            "anthropic/claude-opus-5"
        ));
        assert!(AiClient::is_reasoning_model(
            "openrouter",
            "deepseek/deepseek-r1"
        ));
        assert!(!AiClient::is_reasoning_model(
            "openrouter",
            "anthropic/claude-haiku-4"
        ));

        // custom providers never get suppression params
        assert!(!AiClient::is_reasoning_model("custom", "anything"));
    }

    #[test]
    fn test_build_headers() {
        let gemini_headers = AiClient::build_headers("gemini", "my-gemini-key");
        assert_eq!(gemini_headers.get("x-goog-api-key").unwrap(), "my-gemini-key");

        let openai_headers = AiClient::build_headers("openai", "my-openai-key");
        assert_eq!(openai_headers.get("Authorization").unwrap(), "Bearer my-openai-key");

        let openrouter_headers = AiClient::build_headers("openrouter", "my-or-key");
        assert_eq!(openrouter_headers.get("HTTP-Referer").unwrap(), "https://github.com/itshimelz/DiaryNote");
    }
}
