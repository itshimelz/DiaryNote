//! Canvas 2D minimap component.
//!
//! Monochromatic canvas preview floating in the top-right corner with 4px corner radius,
//! viewport indicator box, "Canvas map" header, and card thumbnails matching React design.

use crate::tokens::{
    colors::*,
    radius::{CornerRadii, CORNER_RADIUS_SM, CORNER_RADIUS_XS},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use domain::models::note::NoteId;
use serde::{Deserialize, Serialize};

/// Lightweight Note Representation for Minimap thumbnail rendering
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MinimapNote {
    pub id: NoteId,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub is_selected: bool,
}

/// Computed Minimap Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MinimapStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub inner_bg: Rgba,
    pub inner_border: Rgba,
    pub card_bg: Rgba,
    pub card_selected_bg: Rgba,
    pub card_border: Rgba,
    pub viewport_border: Rgba,
    pub viewport_bg: Rgba,
    pub header_color: Rgba,
    pub corner_radius: CornerRadii,
    pub card_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub width: f32,
    pub height: f32,
}

/// Declarative Minimap Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Minimap {
    pub width: f32,
    pub height: f32,
    pub notes: Vec<MinimapNote>,
    pub camera_x: f32,
    pub camera_y: f32,
    pub camera_zoom: f32,
    pub screen_width: f32,
    pub screen_height: f32,
    pub is_expanded: bool,
    pub theme: Option<SurfaceTheme>,
}

impl Minimap {
    pub fn new() -> Self {
        Self {
            width: 192.0,
            height: 116.0,
            notes: Vec::new(),
            camera_x: 0.0,
            camera_y: 0.0,
            camera_zoom: 1.0,
            screen_width: 1280.0,
            screen_height: 800.0,
            is_expanded: true,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn with_notes(mut self, notes: Vec<MinimapNote>) -> Self {
        self.notes = notes;
        self
    }

    pub fn with_camera(mut self, pan_x: f32, pan_y: f32, zoom: f32) -> Self {
        self.camera_x = pan_x;
        self.camera_y = pan_y;
        self.camera_zoom = zoom;
        self
    }

    pub fn with_screen_size(mut self, width: f32, height: f32) -> Self {
        self.screen_width = width;
        self.screen_height = height;
        self
    }

    pub fn with_viewport_bounds(self, width: f32, height: f32) -> Self {
        self.with_screen_size(width, height)
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> MinimapStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);
        let card_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (bg, border, inner_bg, inner_border, card_bg, card_selected_bg, card_border, viewport_border, viewport_bg, header_color) =
            if theme.is_dark {
                (
                    SLATE_900.with_alpha(0.85),
                    SLATE_800,
                    SLATE_950.with_alpha(0.8),
                    SLATE_800,
                    SLATE_600.with_alpha(0.75),
                    BLUE_500,
                    SLATE_700,
                    BLUE_500,
                    BLUE_500.with_alpha(0.15),
                    SLATE_400,
                )
            } else {
                (
                    WHITE.with_alpha(0.85),
                    SLATE_200,
                    SLATE_50.with_alpha(0.8),
                    SLATE_200,
                    SLATE_400.with_alpha(0.75),
                    BLUE_600,
                    SLATE_300,
                    BLUE_600,
                    BLUE_600.with_alpha(0.15),
                    SLATE_500,
                )
            };

        MinimapStyle {
            bg,
            border,
            inner_bg,
            inner_border,
            card_bg,
            card_selected_bg,
            card_border,
            viewport_border,
            viewport_bg,
            header_color,
            corner_radius,
            card_radius,
            shadow: ShadowStyle::sm(),
            width: self.width,
            height: self.height,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Minimap {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);
        let w = gpui::px(style.width);

        let map_w = style.width - 16.0; // 176.0
        let map_h = 88.0_f32;

        // Calculate spatial bounds across all notes
        let (min_x, min_y, max_x, max_y) = if self.notes.is_empty() {
            (-200.0, -200.0, 1480.0, 1000.0)
        } else {
            let mut min_x = f32::MAX;
            let mut min_y = f32::MAX;
            let mut max_x = f32::MIN;
            let mut max_y = f32::MIN;

            for n in &self.notes {
                min_x = min_x.min(n.x);
                min_y = min_y.min(n.y);
                max_x = max_x.max(n.x + n.width);
                max_y = max_y.max(n.y + n.height);
            }

            // Include current camera viewport in bounds
            let cam_world_x = -self.camera_x;
            let cam_world_y = -self.camera_y;
            let cam_world_w = self.screen_width / self.camera_zoom;
            let cam_world_h = self.screen_height / self.camera_zoom;

            min_x = min_x.min(cam_world_x) - 100.0;
            min_y = min_y.min(cam_world_y) - 100.0;
            max_x = max_x.max(cam_world_x + cam_world_w) + 100.0;
            max_y = max_y.max(cam_world_y + cam_world_h) + 100.0;

            (min_x, min_y, max_x, max_y)
        };

        let world_w = (max_x - min_x).max(10.0);
        let world_h = (max_y - min_y).max(10.0);

        let scale_x = map_w / world_w;
        let scale_y = map_h / world_h;
        let scale = scale_x.min(scale_y);

        // Build inner viewport map container
        let mut inner_map = gpui::div()
            .relative()
            .w(gpui::px(map_w))
            .h(gpui::px(map_h))
            .rounded(gpui::px(CORNER_RADIUS_XS))
            .bg(gpui::Hsla::from(style.inner_bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.inner_border))
            .overflow_hidden();

        // Render card thumbnails
        for note in &self.notes {
            let nx = ((note.x - min_x) * scale).clamp(0.0, map_w);
            let ny = ((note.y - min_y) * scale).clamp(0.0, map_h);
            let nw = (note.width * scale).max(3.0).min(map_w - nx);
            let nh = (note.height * scale).max(3.0).min(map_h - ny);

            let card_fill = if note.is_selected {
                style.card_selected_bg
            } else {
                style.card_bg
            };

            let card_thumb = gpui::div()
                .absolute()
                .left(gpui::px(nx))
                .top(gpui::px(ny))
                .w(gpui::px(nw))
                .h(gpui::px(nh))
                .rounded(gpui::px(1.0))
                .bg(gpui::Hsla::from(card_fill));

            inner_map = inner_map.child(card_thumb);
        }

        // Render Camera Viewport Rectangle
        let cam_world_x = -self.camera_x;
        let cam_world_y = -self.camera_y;
        let cam_world_w = self.screen_width / self.camera_zoom;
        let cam_world_h = self.screen_height / self.camera_zoom;

        let vx = ((cam_world_x - min_x) * scale).clamp(0.0, map_w - 6.0);
        let vy = ((cam_world_y - min_y) * scale).clamp(0.0, map_h - 6.0);
        let vw = (cam_world_w * scale).max(6.0).min(map_w - vx);
        let vh = (cam_world_h * scale).max(6.0).min(map_h - vy);

        let viewport_box = gpui::div()
            .absolute()
            .left(gpui::px(vx))
            .top(gpui::px(vy))
            .w(gpui::px(vw))
            .h(gpui::px(vh))
            .rounded(gpui::px(CORNER_RADIUS_XS))
            .bg(gpui::Hsla::from(style.viewport_bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.viewport_border));

        inner_map = inner_map.child(viewport_box);

        // Header label
        let header = gpui::div()
            .flex()
            .items_center()
            .justify_between()
            .mb(gpui::px(4.0))
            .px(gpui::px(2.0))
            .child(
                gpui::div()
                    .text_xs()
                    .font_weight(gpui::FontWeight::MEDIUM)
                    .text_color(gpui::Hsla::from(style.header_color))
                    .child("Canvas map"),
            );

        // Outer Floating Panel
        gpui::div()
            .flex()
            .flex_col()
            .w(w)
            .p(gpui::px(8.0))
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border))
            .shadow_sm()
            .child(header)
            .child(inner_map)
    }
}

impl Default for Minimap {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minimap_builder() {
        let mm = Minimap::new();
        assert_eq!(mm.width, 192.0);

        let dark = SurfaceTheme::dark();
        let style = mm.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.shadow, ShadowStyle::sm());
    }
}
