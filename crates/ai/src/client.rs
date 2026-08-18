use crate::error::{AiError, AiResult};
use crate::provider::{AiConfig, ProviderType};
use serde_json::json;

/// Native AI Client for Local & Cloud LLM completions
#[derive(Debug, Clone)]
pub struct AiClient {
    http_client: reqwest::Client,
}

impl Default for AiClient {
    fn default() -> Self {
        Self::new()
    }
}

impl AiClient {
    pub fn new() -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(45))
            .build()
            .unwrap_or_default();

        Self { http_client }
    }

    /// Health check for the configured provider
    pub async fn health_check(&self, config: &AiConfig) -> AiResult<bool> {
        if !config.enabled {
            return Err(AiError::Disabled);
        }

        match config.provider {
            ProviderType::Ollama => {
                let url = config.endpoint.replace("/api/generate", "/api/version");
                let resp = self.http_client.get(&url).send().await?;
                Ok(resp.status().is_success())
            }
            _ => Ok(config.api_key.is_some()),
        }
    }

    /// Execute a completion request against the configured provider
    pub async fn complete(&self, prompt: &str, config: &AiConfig) -> AiResult<String> {
        if !config.enabled {
            return Err(AiError::Disabled);
        }

        let system = config.system_prompt();

        match config.provider {
            ProviderType::Ollama => self.complete_ollama(prompt, &system, config).await,
            ProviderType::OpenAi | ProviderType::Custom => self.complete_openai(prompt, &system, config).await,
            ProviderType::Gemini => self.complete_gemini(prompt, &system, config).await,
            ProviderType::Anthropic => self.complete_anthropic(prompt, &system, config).await,
        }
    }

    /// Summarize note content concisely
    pub async fn summarize_note(&self, title: &str, body: &str, config: &AiConfig) -> AiResult<String> {
        let prompt = format!(
            "Summarize the following note in 2-3 concise bullet points:\n\nTitle: {}\n\nContent:\n{}",
            title, body
        );
        self.complete(&prompt, config).await
    }

    /// Extract actionable tasks into markdown checklists
    pub async fn extract_tasks(&self, body: &str, config: &AiConfig) -> AiResult<Vec<String>> {
        let prompt = format!(
            "Extract all actionable tasks, to-dos, or follow-ups from the text below as a list of markdown checklist items (e.g. '- [ ] Task description'). Return ONLY the checklist items, one per line:\n\n{}",
            body
        );
        let raw = self.complete(&prompt, config).await?;
        let tasks: Vec<String> = raw
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| l.starts_with("- [ ] ") || l.starts_with("- [x] ") || l.starts_with("* [ ] "))
            .collect();
        Ok(tasks)
    }

    /// Suggest relevant tags for a note
    pub async fn generate_tags(&self, body: &str, config: &AiConfig) -> AiResult<Vec<String>> {
        let prompt = format!(
            "Suggest 3 to 6 concise, relevant tags for this note content. Output ONLY a comma-separated list of lowercase, hyphenated tags without any numbering or explanation (e.g., project-alpha, meeting-notes, rust):\n\n{}",
            body
        );
        let raw = self.complete(&prompt, config).await?;
        let tags: Vec<String> = raw
            .split(',')
            .map(|t| t.trim().trim_start_matches('#').to_lowercase())
            .filter(|t| !t.is_empty() && t.len() < 30)
            .collect();
        Ok(tags)
    }

    /// Merge and synthesize multiple notes into a unified document
    pub async fn merge_notes(
        &self,
        notes: &[(String, String)],
        instruction: Option<&str>,
        config: &AiConfig,
    ) -> AiResult<(String, String)> {
        let mut notes_context = String::new();
        for (i, (title, body)) in notes.iter().enumerate() {
            notes_context.push_str(&format!("--- Note {} ({}) ---\n{}\n\n", i + 1, title, body));
        }

        let user_goal = instruction.unwrap_or("Synthesize and combine the key ideas, findings, and tasks from these notes into a cohesive document.");
        let prompt = format!(
            "You are combining multiple notes into a single cohesive document.\n\n\
             Instruction: {}\n\n\
             Notes to merge:\n{}\n\n\
             Format your response as:\n\
             # [Generated Document Title]\n\n\
             [Generated Markdown Body Content]",
            user_goal, notes_context
        );

        let output = self.complete(&prompt, config).await?;
        let (title, body) = Self::split_title_and_body(&output);
        Ok((title, body))
    }

    /// Rewrite note text in a specific tone
    pub async fn rewrite_tone(&self, body: &str, tone: &str, config: &AiConfig) -> AiResult<String> {
        let prompt = format!(
            "Rewrite the following note text to have a {} tone, preserving all technical details and checklist items:\n\n{}",
            tone, body
        );
        self.complete(&prompt, config).await
    }

    // --- Provider Implementations ---

    async fn complete_ollama(&self, prompt: &str, system: &str, config: &AiConfig) -> AiResult<String> {
        let payload = json!({
            "model": config.model,
            "prompt": prompt,
            "system": system,
            "stream": false,
            "options": {
                "temperature": config.temperature,
                "num_predict": config.max_tokens,
            }
        });

        let resp = self
            .http_client
            .post(&config.endpoint)
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!("Ollama error ({status}): {err_text}")));
        }

        let body: serde_json::Value = resp.json().await?;
        let text = body["response"]
            .as_str()
            .ok_or(AiError::EmptyResponse)?
            .trim()
            .to_string();

        Ok(text)
    }

    async fn complete_openai(&self, prompt: &str, system: &str, config: &AiConfig) -> AiResult<String> {
        let api_key = config.api_key.as_deref().ok_or(AiError::MissingApiKey)?;

        let payload = json!({
            "model": config.model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ],
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        });

        let resp = self
            .http_client
            .post(&config.endpoint)
            .header("Authorization", format!("Bearer {api_key}"))
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!("OpenAI error ({status}): {err_text}")));
        }

        let body: serde_json::Value = resp.json().await?;
        let text = body["choices"][0]["message"]["content"]
            .as_str()
            .ok_or(AiError::EmptyResponse)?
            .trim()
            .to_string();

        Ok(text)
    }

    async fn complete_gemini(&self, prompt: &str, system: &str, config: &AiConfig) -> AiResult<String> {
        let api_key = config.api_key.as_deref().ok_or(AiError::MissingApiKey)?;
        let url = format!("{}/{}:generateContent?key={}", config.endpoint, config.model, api_key);

        let payload = json!({
            "systemInstruction": {
                "parts": [{ "text": system }]
            },
            "contents": [
                {
                    "parts": [{ "text": prompt }]
                }
            ],
            "generationConfig": {
                "temperature": config.temperature,
                "maxOutputTokens": config.max_tokens,
            }
        });

        let resp = self
            .http_client
            .post(&url)
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!("Gemini error ({status}): {err_text}")));
        }

        let body: serde_json::Value = resp.json().await?;
        let text = body["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or(AiError::EmptyResponse)?
            .trim()
            .to_string();

        Ok(text)
    }

    async fn complete_anthropic(&self, prompt: &str, system: &str, config: &AiConfig) -> AiResult<String> {
        let api_key = config.api_key.as_deref().ok_or(AiError::MissingApiKey)?;

        let payload = json!({
            "model": config.model,
            "system": system,
            "messages": [
                { "role": "user", "content": prompt }
            ],
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
        });

        let resp = self
            .http_client
            .post(&config.endpoint)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider(format!("Anthropic error ({status}): {err_text}")));
        }

        let body: serde_json::Value = resp.json().await?;
        let text = body["content"][0]["text"]
            .as_str()
            .ok_or(AiError::EmptyResponse)?
            .trim()
            .to_string();

        Ok(text)
    }

    fn split_title_and_body(raw: &str) -> (String, String) {
        let lines: Vec<&str> = raw.lines().collect();
        if let Some(first) = lines.first() {
            if first.starts_with("# ") {
                let title = first.trim_start_matches("# ").trim().to_string();
                let body = lines[1..].join("\n").trim().to_string();
                return (title, body);
            }
        }
        ("Synthesized Notes".to_string(), raw.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_title_and_body() {
        let raw = "# Project Summary\n\n- [x] Item 1\n- [ ] Item 2";
        let (title, body) = AiClient::split_title_and_body(raw);
        assert_eq!(title, "Project Summary");
        assert_eq!(body, "- [x] Item 1\n- [ ] Item 2");

        let raw_no_heading = "Just a body note without a heading.";
        let (title, body) = AiClient::split_title_and_body(raw_no_heading);
        assert_eq!(title, "Synthesized Notes");
        assert_eq!(body, "Just a body note without a heading.");
    }

    #[test]
    fn test_task_filtering_format() {
        let raw = "- [ ] Fix database connection\n- [x] Review layout\nIrrelevant line\n* [ ] Update docs";
        let tasks: Vec<String> = raw
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| l.starts_with("- [ ] ") || l.starts_with("- [x] ") || l.starts_with("* [ ] "))
            .collect();
        assert_eq!(tasks.len(), 3);
        assert_eq!(tasks[0], "- [ ] Fix database connection");
    }

    #[test]
    fn test_tag_parsing_format() {
        let raw = "rust, gpui, sqlite-wal, #architecture";
        let tags: Vec<String> = raw
            .split(',')
            .map(|t| t.trim().trim_start_matches('#').to_lowercase())
            .filter(|t| !t.is_empty())
            .collect();
        assert_eq!(tags, vec!["rust", "gpui", "sqlite-wal", "architecture"]);
    }
}
