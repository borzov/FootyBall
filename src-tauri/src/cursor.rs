use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, WebviewWindow};

// Ball position reported by the frontend, in CSS px relative to the window.
#[derive(Default, Clone, Copy)]
pub struct BallPos {
    pub x: f64,
    pub y: f64,
    pub r: f64,
    pub valid: bool,
}

pub struct BallState(pub Mutex<BallPos>);

// Pure hit-test: is the global physical cursor within the ball circle?
// All inputs are physical screen pixels.
pub fn is_cursor_on_ball(
    cursor_x: f64,
    cursor_y: f64,
    ball_phys_x: f64,
    ball_phys_y: f64,
    ball_phys_r: f64,
) -> bool {
    let dx = cursor_x - ball_phys_x;
    let dy = cursor_y - ball_phys_y;
    (dx * dx + dy * dy).sqrt() <= ball_phys_r
}

#[cfg(test)]
mod tests {
    use super::is_cursor_on_ball;

    #[test]
    fn inside_circle_is_true() {
        assert!(is_cursor_on_ball(105.0, 100.0, 100.0, 100.0, 32.0));
    }

    #[test]
    fn outside_circle_is_false() {
        assert!(!is_cursor_on_ball(200.0, 100.0, 100.0, 100.0, 32.0));
    }

    #[test]
    fn exactly_on_edge_is_true() {
        assert!(is_cursor_on_ball(132.0, 100.0, 100.0, 100.0, 32.0));
    }
}

// Spawns a background loop that, ~60 times per second, reads the global cursor
// position and toggles ignore_cursor_events so only the ball is clickable.
// Converts the frontend's CSS-px ball position into global physical pixels
// using the window's outer position and scale factor.
pub fn spawn_cursor_loop(window: WebviewWindow) {
    std::thread::spawn(move || {
        let mut currently_ignoring = true;
        loop {
            std::thread::sleep(Duration::from_millis(16));

            let ball = {
                let state = window.state::<BallState>();
                let guard = state.0.lock().unwrap();
                *guard
            };

            let mut should_ignore = true;
            if ball.valid {
                if let (Ok(cursor), Ok(outer), Ok(scale)) = (
                    window.cursor_position(),
                    window.outer_position(),
                    window.scale_factor(),
                ) {
                    let ball_phys_x = outer.x as f64 + ball.x * scale;
                    let ball_phys_y = outer.y as f64 + ball.y * scale;
                    let ball_phys_r = ball.r * scale;
                    let on_ball =
                        is_cursor_on_ball(cursor.x, cursor.y, ball_phys_x, ball_phys_y, ball_phys_r);
                    should_ignore = !on_ball;
                }
            }

            if should_ignore != currently_ignoring {
                let _ = window.set_ignore_cursor_events(should_ignore);
                currently_ignoring = should_ignore;
            }
        }
    });
}
