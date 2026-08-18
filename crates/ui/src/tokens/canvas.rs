//! Canvas grid, note dimensions, and zoom level constants.
//!
//! Directly matches DiaryNote's canvas constants.

pub const GRID_SIZE: f32 = 24.0;
pub const DEFAULT_NOTE_WIDTH: f32 = 432.0;
pub const DEFAULT_NOTE_HEIGHT: f32 = 408.0;
pub const MIN_NOTE_WIDTH: f32 = 200.0;
pub const MIN_NOTE_HEIGHT: f32 = 160.0;
pub const MIN_ZOOM: f32 = 0.15;
pub const MAX_ZOOM: f32 = 3.0;
pub const DEFAULT_ZOOM: f32 = 1.0;
pub const DRAG_Z_INDEX: i32 = 10000;
