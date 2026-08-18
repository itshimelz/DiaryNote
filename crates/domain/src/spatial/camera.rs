use crate::models::note::Point2D;
use crate::spatial::bounds::Rect2D;
use serde::{Deserialize, Serialize};

/// 2D Camera viewport state controlling pan and zoom
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CanvasCamera {
    pub pan_x: f32,
    pub pan_y: f32,
    pub zoom: f32,
}

impl CanvasCamera {
    pub const MIN_ZOOM: f32 = 0.1;
    pub const MAX_ZOOM: f32 = 5.0;
    pub const DEFAULT_ZOOM: f32 = 1.0;

    pub fn new(pan_x: f32, pan_y: f32, zoom: f32) -> Self {
        Self {
            pan_x,
            pan_y,
            zoom: zoom.clamp(Self::MIN_ZOOM, Self::MAX_ZOOM),
        }
    }

    pub fn reset() -> Self {
        Self {
            pan_x: 0.0,
            pan_y: 0.0,
            zoom: Self::DEFAULT_ZOOM,
        }
    }

    /// Convert screen coordinate (e.g. mouse event) to world/canvas coordinate
    pub fn screen_to_canvas(&self, screen: Point2D) -> Point2D {
        Point2D::new(
            (screen.x - self.pan_x) / self.zoom,
            (screen.y - self.pan_y) / self.zoom,
        )
    }

    /// Convert world/canvas coordinate to screen pixel coordinate
    pub fn canvas_to_screen(&self, canvas: Point2D) -> Point2D {
        Point2D::new(
            canvas.x * self.zoom + self.pan_x,
            canvas.y * self.zoom + self.pan_y,
        )
    }

    /// Convert screen viewport rectangle to world canvas bounding rectangle
    pub fn screen_rect_to_canvas_rect(&self, screen_min: Point2D, screen_max: Point2D) -> Rect2D {
        let p1 = self.screen_to_canvas(screen_min);
        let p2 = self.screen_to_canvas(screen_max);
        Rect2D::new(p1.x, p1.y, p2.x, p2.y)
    }

    /// Zooms into/out of a specific screen anchor point (e.g., cursor location)
    pub fn zoom_at(&mut self, screen_anchor: Point2D, new_zoom: f32) {
        let clamped_zoom = new_zoom.clamp(Self::MIN_ZOOM, Self::MAX_ZOOM);
        if (clamped_zoom - self.zoom).abs() < f32::EPSILON {
            return;
        }

        // Keep the canvas point under the cursor unchanged:
        // (screen_anchor.x - old_pan) / old_zoom == (screen_anchor.x - new_pan) / new_zoom
        let canvas_pt = self.screen_to_canvas(screen_anchor);
        self.zoom = clamped_zoom;
        self.pan_x = screen_anchor.x - (canvas_pt.x * self.zoom);
        self.pan_y = screen_anchor.y - (canvas_pt.y * self.zoom);
    }

    /// Smoothly center the camera on a specific world canvas point
    pub fn center_on(&mut self, canvas_center: Point2D, screen_viewport_size: Point2D) {
        self.pan_x = (screen_viewport_size.x * 0.5) - (canvas_center.x * self.zoom);
        self.pan_y = (screen_viewport_size.y * 0.5) - (canvas_center.y * self.zoom);
    }
}

impl Default for CanvasCamera {
    fn default() -> Self {
        Self::reset()
    }
}
