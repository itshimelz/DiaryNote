//! Infinite canvas view state and rendering descriptor.
//!
//! Handles viewport camera, grid rendering (24px dots), selection rectangle (rubber-band marquee),
//! and visible card culling against R-Tree bounds.

use crate::tokens::{
    canvas::*,
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_XS},
    surfaces::SurfaceTheme,
};
use domain::models::note::NoteId;
use domain::spatial::camera::CanvasCamera;
use serde::{Deserialize, Serialize};

/// Marquee Selection Box in world coordinates
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct MarqueeBox {
    pub start_x: f32,
    pub start_y: f32,
    pub current_x: f32,
    pub current_y: f32,
}

impl MarqueeBox {
    pub fn new(x: f32, y: f32) -> Self {
        Self {
            start_x: x,
            start_y: y,
            current_x: x,
            current_y: y,
        }
    }

    pub fn aabb(&self) -> (f32, f32, f32, f32) {
        let min_x = self.start_x.min(self.current_x);
        let max_x = self.start_x.max(self.current_x);
        let min_y = self.start_y.min(self.current_y);
        let max_y = self.start_y.max(self.current_y);
        (min_x, min_y, max_x, max_y)
    }

    pub fn width(&self) -> f32 {
        (self.current_x - self.start_x).abs()
    }

    pub fn height(&self) -> f32 {
        (self.current_y - self.start_y).abs()
    }
}

/// Computed Canvas View Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CanvasViewStyle {
    pub bg_color: Rgba,
    pub dot_color: Rgba,
    pub grid_size: f32,
    pub marquee_bg: Rgba,
    pub marquee_border: Rgba,
    pub marquee_radius: CornerRadii,
}

/// Declarative InfiniteCanvasView Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InfiniteCanvasView {
    pub camera: CanvasCamera,
    pub show_grid: bool,
    pub snap_to_grid: bool,
    pub selected_note_ids: Vec<NoteId>,
    pub marquee: Option<MarqueeBox>,
    pub is_panning: bool,
}

impl InfiniteCanvasView {
    pub fn new(_screen_width: f32, _screen_height: f32) -> Self {
        Self {
            camera: CanvasCamera::new(0.0, 0.0, 1.0),
            show_grid: true,
            snap_to_grid: false,
            selected_note_ids: Vec::new(),
            marquee: None,
            is_panning: false,
        }
    }

    pub fn with_zoom(mut self, zoom: f32) -> Self {
        self.camera.zoom = zoom.clamp(MIN_ZOOM, MAX_ZOOM);
        self
    }

    pub fn with_selected(mut self, ids: Vec<NoteId>) -> Self {
        self.selected_note_ids = ids;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> CanvasViewStyle {
        let (bg_color, dot_color) = if theme.is_dark {
            (SLATE_950, SLATE_800.with_alpha(0.8))
        } else {
            (SLATE_100, SLATE_300.with_alpha(0.8))
        };

        CanvasViewStyle {
            bg_color,
            dot_color,
            grid_size: GRID_SIZE,
            marquee_bg: BLUE_500.with_alpha(0.12),
            marquee_border: BLUE_500.with_alpha(0.8),
            marquee_radius: CornerRadii::uniform(CORNER_RADIUS_XS),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canvas_view() {
        let mut view = InfiniteCanvasView::new(1920.0, 1080.0).with_zoom(1.5);

        assert_eq!(view.camera.zoom, 1.5);
        assert!(view.show_grid);

        view.marquee = Some(MarqueeBox {
            start_x: 10.0,
            start_y: 20.0,
            current_x: 110.0,
            current_y: 220.0,
        });

        let (min_x, min_y, max_x, max_y) = view.marquee.unwrap().aabb();
        assert_eq!(min_x, 10.0);
        assert_eq!(max_x, 110.0);
        assert_eq!(min_y, 20.0);
        assert_eq!(max_y, 220.0);

        let dark = SurfaceTheme::dark();
        let style = view.compute_style(&dark);
        assert_eq!(style.grid_size, 24.0);
    }
}
