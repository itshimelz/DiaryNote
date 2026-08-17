use crate::utils::validate_and_resolve_export_path;

/// Tauri command to securely save an exported database backup file inside ~/DiaryNote
#[tauri::command]
pub fn save_export_file(
    filename: String,
    content: String,
    subfolder: Option<String>,
) -> Result<String, String> {
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Failed to determine home directory: {}", e))?;

    let file_path = validate_and_resolve_export_path(&home_dir, &filename, subfolder.as_deref())?;

    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    std::fs::write(&file_path, content).map_err(|e| format!("Failed to write export file: {}", e))?;

    Ok(file_path.to_string_lossy().into_owned())
}

/// Formats and exports a single note to disk in Markdown, TXT, or JSON format.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn export_note_to_file(
    note_id: String,
    title: String,
    content: String,
    export_format: String,
    tags: Option<Vec<String>>,
    created_at: String,
    updated_at: String,
    subfolder: Option<String>,
) -> Result<String, String> {
    let clean_title = title.trim();
    let safe_title = if clean_title.is_empty() {
        "Untitled Note"
    } else {
        clean_title
    };

    // Sanitize filename by replacing illegal path characters with hyphen
    let sanitized_name: String = safe_title
        .chars()
        .map(|c| {
            if c == '/'
                || c == '\\'
                || c == ':'
                || c == '*'
                || c == '?'
                || c == '"'
                || c == '<'
                || c == '>'
                || c == '|'
            {
                '-'
            } else {
                c
            }
        })
        .collect();

    let ext = match export_format.to_lowercase().as_str() {
        "json" => "json",
        "txt" => "txt",
        _ => "md",
    };

    let filename = format!("{}.{}", sanitized_name.trim_matches('-'), ext);

    let export_body = match ext {
        "md" => {
            let tags_str = tags
                .as_ref()
                .map(|t| format!("tags: [{}]\n", t.join(", ")))
                .unwrap_or_default();
            format!(
                "---\ntitle: \"{}\"\ncreated: \"{}\"\nupdated: \"{}\"\n{}---\n\n# {}\n\n{}",
                safe_title, created_at, updated_at, tags_str, safe_title, content
            )
        }
        "txt" => {
            let tags_str = tags
                .as_ref()
                .map(|t| format!("Tags: {}\n", t.join(", ")))
                .unwrap_or_default();
            format!(
                "{}\n====================\nCreated: {}\nUpdated: {}\n{}\n\n{}",
                safe_title, created_at, updated_at, tags_str, content
            )
        }
        "json" => {
            let obj = serde_json::json!({
                "id": note_id,
                "title": safe_title,
                "content": content,
                "tags": tags.unwrap_or_default(),
                "createdAt": created_at,
                "updatedAt": updated_at,
                "exportedAt": chrono::Utc::now().to_rfc3339(),
            });
            serde_json::to_string_pretty(&obj)
                .map_err(|e| format!("JSON serialization error: {}", e))?
        }
        _ => content,
    };

    let target_subfolder = subfolder.or_else(|| Some("Exports".to_string()));
    save_export_file(filename, export_body, target_subfolder)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_note_to_file_markdown() {
        let res = export_note_to_file(
            "n-1".to_string(),
            "Daily Ideas".to_string(),
            "Exploring ideas".to_string(),
            "md".to_string(),
            Some(vec!["ideas".to_string(), "todo".to_string()]),
            "2026-08-18T00:00:00Z".to_string(),
            "2026-08-18T01:00:00Z".to_string(),
            Some("TestExports".to_string()),
        );
        assert!(res.is_ok());
        let path = res.unwrap();
        assert!(path.ends_with("Daily Ideas.md"));
        assert!(std::path::Path::new(&path).exists());
        let _ = std::fs::remove_file(path);
    }
}
