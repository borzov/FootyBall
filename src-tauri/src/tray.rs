use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    App, Manager,
};
use tauri_plugin_autostart::ManagerExt;

// Builds the tray icon with: Show/Hide ball, Launch at login (checkbox), Quit.
pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);

    let toggle = MenuItemBuilder::with_id("toggle", "Hide ball").build(app)?;
    let autostart = CheckMenuItemBuilder::with_id("autostart", "Launch at login")
        .checked(autostart_enabled)
        .build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&toggle, &autostart])
        .separator()
        .items(&[&quit])
        .build()?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().expect("app icon not configured").clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "toggle" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                        let _ = toggle.set_text("Show ball");
                    } else {
                        let _ = window.show();
                        let _ = toggle.set_text("Hide ball");
                    }
                }
            }
            "autostart" => {
                let manager = app.autolaunch();
                let enabled = manager.is_enabled().unwrap_or(false);
                if enabled {
                    let _ = manager.disable();
                } else {
                    let _ = manager.enable();
                }
                let _ = autostart.set_checked(manager.is_enabled().unwrap_or(false));
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
