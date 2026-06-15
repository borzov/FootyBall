mod cursor;
mod overlay;
mod tray;

use cursor::{BallPos, BallState};
use tauri::Manager;

// Command: frontend reports the ball's current circle (CSS px, window-relative).
#[tauri::command]
fn update_ball(state: tauri::State<BallState>, x: f64, y: f64, r: f64) {
    let mut guard = state.0.lock().unwrap();
    *guard = BallPos { x, y, r, valid: true };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(BallState(std::sync::Mutex::new(BallPos::default())))
        .invoke_handler(tauri::generate_handler![update_ball])
        .setup(|app| {
            // Run as a menubar/tray accessory app on macOS (no Dock icon).
            #[cfg(target_os = "macos")]
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app.get_webview_window("main").expect("main window");
            overlay::setup_overlay(&window)?;
            tray::setup_tray(app)?;
            cursor::spawn_cursor_loop(window);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
