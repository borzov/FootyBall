use tauri::WebviewWindow;

// Resize and position the overlay to cover the primary monitor work area,
// then enable click-through by default. Called once at startup.
pub fn setup_overlay(window: &WebviewWindow) -> tauri::Result<()> {
    if let Some(monitor) = window.primary_monitor()? {
        let size = monitor.size();
        let pos = monitor.position();
        window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y))?;
        window.set_size(tauri::PhysicalSize::new(size.width, size.height))?;
    }
    // Click-through everywhere until the cursor loop detects the ball.
    window.set_ignore_cursor_events(true)?;
    window.show()?;
    Ok(())
}
