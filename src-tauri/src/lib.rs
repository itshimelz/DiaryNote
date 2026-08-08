#[tauri::command]
fn save_export_file(filename: String, content: String, subfolder: Option<String>) -> Result<String, String> {
  let home_dir = std::env::var("HOME")
    .or_else(|_| std::env::var("USERPROFILE"))
    .map_err(|e| e.to_string())?;

  let mut export_dir = std::path::Path::new(&home_dir).join("DiaryNote");
  if let Some(sub) = subfolder {
    if !sub.trim().is_empty() {
      export_dir = export_dir.join(sub.trim());
    }
  }

  std::fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;

  let file_path = export_dir.join(&filename);
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
