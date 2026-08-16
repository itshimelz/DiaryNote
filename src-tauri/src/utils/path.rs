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
    let mut target_dir = base_dir;

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
