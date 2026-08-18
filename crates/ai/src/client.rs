use crate::error::AiResult;

pub struct AiClient;

impl AiClient {
    pub fn new() -> Self {
        Self
    }

    pub async fn health_check(&self) -> AiResult<bool> {
        Ok(true)
    }
}

impl Default for AiClient {
    fn default() -> Self {
        Self::new()
    }
}
