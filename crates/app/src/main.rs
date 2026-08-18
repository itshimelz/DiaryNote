#![recursion_limit = "256"]

mod persistence;
mod state;
mod workspace;

use gpui::*;
use workspace::WorkspaceView;

fn main() {
    Application::new().run(|cx: &mut App| {
        let options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(Bounds::centered(
                None,
                size(px(1280.0), px(800.0)),
                cx,
            ))),
            titlebar: Some(TitlebarOptions {
                title: Some("DiaryNote".into()),
                ..Default::default()
            }),
            ..Default::default()
        };

        cx.open_window(options, |_window, cx| cx.new(|_cx| WorkspaceView::new()))
            .unwrap();
    });
}
