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
