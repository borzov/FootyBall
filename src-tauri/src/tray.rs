use std::sync::Mutex;

use tauri::{
    menu::{CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    App, Emitter, Manager, Wry,
};
use tauri_plugin_autostart::ManagerExt;

// Ball designs available in the tray submenu: (id, label). The id must match the
// frontend `BallId` (src/skins.ts) and the skin filename (src/balls/<id>.svg).
const BALL_DESIGNS: &[(&str, &str)] = &[
    ("classic", "Classic"),
    ("trionda", "World Cup 2026"),
    ("retro", "Retro Leather"),
    ("redsport", "Red-White Sport"),
    ("neon", "Neon Night"),
    ("gold", "Gold Edition"),
];

const DEFAULT_BALL: &str = "classic";

// Holds the ball check-menu items so both the tray click handler and the
// `sync_ball_menu` command can keep exactly one of them checked.
pub struct BallMenu(pub Mutex<Vec<(String, CheckMenuItem<Wry>)>>);

fn set_active_ball(items: &[(String, CheckMenuItem<Wry>)], active: &str) {
    for (id, item) in items {
        let _ = item.set_checked(id == active);
    }
}

// Command: the frontend reports its persisted selection on startup so the tray
// checkmark matches the ball that will actually be rendered.
#[tauri::command]
pub fn sync_ball_menu(state: tauri::State<BallMenu>, id: String) {
    if let Ok(items) = state.0.lock() {
        set_active_ball(&items, &id);
    }
}

// Builds the tray icon with: Show/Hide ball, Launch at login (checkbox),
// Ball ▸ (design picker), Quit.
pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);

    let toggle = MenuItemBuilder::with_id("toggle", "Hide ball").build(app)?;
    let autostart = CheckMenuItemBuilder::with_id("autostart", "Launch at login")
        .checked(autostart_enabled)
        .build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    // Ball design submenu — one check item per design, default checked on
    // Classic. The frontend re-syncs the checkmark to the persisted choice.
    let mut ball_items: Vec<(String, CheckMenuItem<Wry>)> = Vec::new();
    let mut ball_builder = SubmenuBuilder::new(app, "Ball");
    for (id, label) in BALL_DESIGNS {
        let item = CheckMenuItemBuilder::with_id(format!("ball:{id}"), *label)
            .checked(*id == DEFAULT_BALL)
            .build(app)?;
        ball_builder = ball_builder.item(&item);
        ball_items.push((id.to_string(), item));
    }
    let ball_submenu = ball_builder.build()?;
    app.manage(BallMenu(Mutex::new(ball_items)));

    let menu = MenuBuilder::new(app)
        .items(&[&toggle, &autostart])
        .item(&ball_submenu)
        .separator()
        .items(&[&quit])
        .build()?;

    // Title-only tray: the soccer-ball glyph is the menubar icon (no separate
    // app-logo icon, which would show up as an extra item beside it).
    TrayIconBuilder::with_id("main-tray")
        .title("⚽")
        .tooltip("FootyBall")
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
            other => {
                // Ball design picked: check it (uncheck the rest) and tell the
                // webview to switch the rendered skin.
                if let Some(ball) = other.strip_prefix("ball:") {
                    let state = app.state::<BallMenu>();
                    if let Ok(items) = state.0.lock() {
                        set_active_ball(&items, ball);
                    }
                    let _ = app.emit("ball-changed", ball.to_string());
                }
            }
        })
        .build(app)?;

    Ok(())
}
