use crate::error::AppError;

/// Opens an external URL or web link in the system's default / active browser.
#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), AppError> {
    let trimmed = url.trim();
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") && !trimmed.starts_with("mailto:") {
        return Err(AppError::Validation(
            "Only http, https, and mailto URLs can be opened externally".to_string(),
        ));
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open browser via xdg-open: {}", e)))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open browser via open: {}", e)))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open browser via cmd start: {}", e)))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validates_url_scheme() {
        assert!(open_external_url("ftp://example.com".to_string()).is_err());
        assert!(open_external_url("file:///etc/passwd".to_string()).is_err());
        assert!(open_external_url("javascript:alert(1)".to_string()).is_err());
    }
}
