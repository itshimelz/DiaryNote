use serde::{Deserialize, Serialize};

/// Supported AI LLM providers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    #[default]
    Ollama,
    OpenAi,
    Gemini,
    Anthropic,
    Custom,
}

impl ProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ollama => "ollama",
            Self::OpenAi => "openai",
            Self::Gemini => "gemini",
            Self::Anthropic => "anthropic",
            Self::Custom => "custom",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Ollama => "Ollama (Local)",
            Self::OpenAi => "OpenAI / OpenRouter",
            Self::Gemini => "Google Gemini",
            Self::Anthropic => "Anthropic Claude",
            Self::Custom => "Custom Endpoint",
        }
    }

    pub fn default_endpoint(&self) -> &'static str {
        match self {
            Self::Ollama => "http://localhost:11434/api/generate",
            Self::OpenAi => "https://api.openai.com/v1/chat/completions",
            Self::Gemini => "https://generativelanguage.googleapis.com/v1beta/models",
            Self::Anthropic => "https://api.anthropic.com/v1/messages",
            Self::Custom => "http://localhost:8080/v1/chat/completions",
        }
    }

    pub fn default_model(&self) -> &'static str {
        match self {
            Self::Ollama => "llama3.2",
            Self::OpenAi => "gpt-4o-mini",
            Self::Gemini => "gemini-1.5-flash",
            Self::Anthropic => "claude-3-5-sonnet-latest",
            Self::Custom => "default",
        }
    }

    pub fn from_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "openai" => Self::OpenAi,
            "gemini" => Self::Gemini,
            "anthropic" | "claude" => Self::Anthropic,
            "custom" => Self::Custom,
            _ => Self::Ollama,
        }
    }
}

/// Global AI Configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: ProviderType,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: usize,
    pub enabled: bool,
    pub custom_system_prompt: Option<String>,
}

impl Default for AiConfig {
    fn default() -> Self {
        let provider = ProviderType::Ollama;
        Self {
            provider,
            endpoint: provider.default_endpoint().to_string(),
            api_key: None,
            model: provider.default_model().to_string(),
            temperature: 0.7,
            max_tokens: 2048,
            enabled: true,
            custom_system_prompt: None,
        }
    }
}

impl AiConfig {
    pub fn new(provider: ProviderType) -> Self {
        Self {
            provider,
            endpoint: provider.default_endpoint().to_string(),
            model: provider.default_model().to_string(),
            ..Default::default()
        }
    }

    pub fn with_api_key(mut self, key: impl Into<String>) -> Self {
        self.api_key = Some(key.into());
        self
    }

    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }

    pub fn with_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.endpoint = endpoint.into();
        self
    }

    /// System instructions with STRICT ZERO-EMOJIS enforcement
    pub fn system_prompt(&self) -> String {
        let base = "You are DiaryNote AI, a precise, high-performance personal knowledge assistant. \
                    Provide concise, well-structured, clear markdown output. \
                    CRITICAL CONSTRAINT: Do NOT use any emojis, emoticons, or Unicode pictorial glyphs in titles, headers, or text bodies. Always use clean typography, standard punctuation, and markdown formatting.";
        if let Some(custom) = &self.custom_system_prompt {
            format!("{base}\n\nUser instructions: {custom}")
        } else {
            base.to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_config_defaults() {
        let cfg = AiConfig::default();
        assert_eq!(cfg.provider, ProviderType::Ollama);
        assert_eq!(cfg.endpoint, "http://localhost:11434/api/generate");
        assert_eq!(cfg.model, "llama3.2");
        assert!(cfg.system_prompt().contains("Do NOT use any emojis"));
    }

    #[test]
    fn test_provider_from_name() {
        assert_eq!(ProviderType::from_name("openai"), ProviderType::OpenAi);
        assert_eq!(ProviderType::from_name("gemini"), ProviderType::Gemini);
        assert_eq!(ProviderType::from_name("claude"), ProviderType::Anthropic);
        assert_eq!(ProviderType::from_name("unknown"), ProviderType::Ollama);
    }
}
