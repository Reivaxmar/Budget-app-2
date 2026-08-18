// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Writes bytes to an arbitrary, user-chosen path (e.g. one returned by the
// dialog plugin's save picker). Deliberately a plain command rather than
// going through `tauri-plugin-fs`'s `writeFile`: that plugin's write
// commands are restricted to paths pre-declared in the capability's
// `fs:scope`, which can't be known ahead of time for a path the user picks
// interactively. Custom commands aren't subject to that plugin scope.
#[tauri::command]
fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, write_binary_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn write_binary_file_writes_the_given_bytes_to_the_given_path() {
        let dir = std::env::temp_dir().join(format!("tauri-app-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("estimate-001-26.pdf");

        let result = write_binary_file(path.to_str().unwrap().to_string(), vec![1, 2, 3, 4]);

        assert!(result.is_ok());
        assert_eq!(std::fs::read(&path).unwrap(), vec![1, 2, 3, 4]);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn write_binary_file_returns_an_error_instead_of_panicking_for_an_unwritable_path() {
        // A path inside a directory that doesn't exist and won't be created.
        let path = "/nonexistent-directory-for-test/estimate.pdf".to_string();

        let result = write_binary_file(path, vec![1, 2, 3]);

        assert!(result.is_err());
    }
}
