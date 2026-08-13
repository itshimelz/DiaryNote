use std::path::{Component, Path, PathBuf};

/// Validates and resolves the export file path ensuring it remains strictly inside ~/DiaryNote
pub fn validate_and_resolve_export_path(
    home_dir: &str,
    filename: &str,
    subfolder: Option<&str>,
) -> Result<PathBuf, String> {
    let clean_filename = filename.trim();
    if clean_filename.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }

    // Reject path separators or parent directory references in filename
    if clean_filename.contains('/') || clean_filename.contains('\\') || clean_filename.contains("..") {
        return Err("Invalid filename: path traversal characters are not permitted".to_string());
    }

    let file_path_test = Path::new(clean_filename);
    if file_path_test.components().count() != 1 {
        return Err("Invalid filename structure".to_string());
    }
    match file_path_test.components().next() {
        Some(Component::Normal(_)) => {}
        _ => return Err("Invalid filename component".to_string()),
    }

    let base_dir = PathBuf::from(home_dir).join("DiaryNote");
    let mut target_dir = base_dir.clone();

    if let Some(sub) = subfolder {
        let sub_trimmed = sub.trim();
        if !sub_trimmed.is_empty() {
            let sub_path = Path::new(sub_trimmed);
            for component in sub_path.components() {
                match component {
                    Component::Normal(c) => {
                        target_dir.push(c);
                    }
                    _ => {
                        return Err("Invalid subfolder: path traversal characters are not permitted".to_string());
                    }
                }
            }
        }
    }

    let target_file = target_dir.join(clean_filename);
    Ok(target_file)
}

#[tauri::command]
fn save_export_file(filename: String, content: String, subfolder: Option<String>) -> Result<String, String> {
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| e.to_string())?;

    let file_path = validate_and_resolve_export_path(&home_dir, &filename, subfolder.as_deref())?;

    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![save_export_file])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_export_path() {
        let res = validate_and_resolve_export_path("/home/user", "backup.json", None);
        assert!(res.is_ok());
        let path = res.unwrap();
        assert_eq!(path, PathBuf::from("/home/user/DiaryNote/backup.json"));
    }

    #[test]
    fn test_valid_export_subfolder() {
        let res = validate_and_resolve_export_path("/home/user", "backup.json", Some("backups/2026"));
        assert!(res.is_ok());
        let path = res.unwrap();
        assert_eq!(path, PathBuf::from("/home/user/DiaryNote/backups/2026/backup.json"));
    }

    #[test]
    fn test_rejects_path_traversal_filename() {
        let res = validate_and_resolve_export_path("/home/user", "../../.bashrc", None);
        assert!(res.is_err());

        let res_win = validate_and_resolve_export_path("C:\\Users\\user", "..\\..\\boot.ini", None);
        assert!(res_win.is_err());
    }

    #[test]
    fn test_rejects_path_traversal_subfolder() {
        let res = validate_and_resolve_export_path("/home/user", "backup.json", Some("../../../etc"));
        assert!(res.is_err());
    }

    #[test]
    fn test_rejects_empty_filename() {
        let res = validate_and_resolve_export_path("/home/user", "", None);
        assert!(res.is_err());
    }
}
