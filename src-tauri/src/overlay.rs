use tauri::WebviewWindow;

// Resize and position the overlay to cover the primary monitor work area,
// then enable click-through by default. Called once at startup.
pub fn setup_overlay(window: &WebviewWindow) -> tauri::Result<()> {
    if let Some(monitor) = window.primary_monitor()? {
        // Use the work area (excludes the macOS menu bar / Windows taskbar /
        // dock) so the window's visible bounds match the screen and the ball
        // touches every edge with its outer rim instead of sinking off-screen.
        let area = monitor.work_area();
        window.set_position(area.position)?;
        window.set_size(area.size)?;
    }
    // Click-through everywhere until the cursor loop detects the ball.
    window.set_ignore_cursor_events(true)?;
    window.show()?;
    Ok(())
}
