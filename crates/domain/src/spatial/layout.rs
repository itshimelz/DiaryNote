//! Spatial layout, multi-card alignment, distribution, and group bounding algorithms.
//!
//! Provides geometric calculations for card alignments matching the React/Tauri canvas engine.

use crate::models::note::{Note, Point2D};
use crate::spatial::bounds::Rect2D;

pub const GRID_SIZE: f32 = 24.0;
pub const DEFAULT_NOTE_WIDTH: f32 = 320.0;
pub const DEFAULT_NOTE_HEIGHT: f32 = 240.0;

/// Aligns a list of notes to the topmost Y position.
pub fn align_top(notes: &mut [Note]) {
    if notes.len() < 2 {
        return;
    }
    let min_y = notes
        .iter()
        .map(|n| n.position.y)
        .fold(f32::INFINITY, f32::min);

    for note in notes.iter_mut() {
        note.position.y = min_y;
        note.touch();
    }
}

/// Aligns a list of notes to the leftmost X position.
pub fn align_left(notes: &mut [Note]) {
    if notes.len() < 2 {
        return;
    }
    let min_x = notes
        .iter()
        .map(|n| n.position.x)
        .fold(f32::INFINITY, f32::min);

    for note in notes.iter_mut() {
        note.position.x = min_x;
        note.touch();
    }
}

/// Aligns a list of notes to their average horizontal center position.
pub fn align_center_horizontal(notes: &mut [Note]) {
    if notes.len() < 2 {
        return;
    }
    let avg_center_x = notes
        .iter()
        .map(|n| n.position.x + n.size.width / 2.0)
        .sum::<f32>()
        / notes.len() as f32;

    for note in notes.iter_mut() {
        note.position.x = (avg_center_x - note.size.width / 2.0).round();
        note.touch();
    }
}

/// Aligns a list of notes to the bottommost edge.
pub fn align_bottom(notes: &mut [Note]) {
    if notes.len() < 2 {
        return;
    }
    let max_bottom = notes
        .iter()
        .map(|n| n.position.y + n.size.height)
        .fold(f32::NEG_INFINITY, f32::max);

    for note in notes.iter_mut() {
        note.position.y = (max_bottom - note.size.height).round();
        note.touch();
    }
}

/// Aligns a list of notes to their average vertical center position.
pub fn align_center_vertical(notes: &mut [Note]) {
    if notes.len() < 2 {
        return;
    }
    let avg_center_y = notes
        .iter()
        .map(|n| n.position.y + n.size.height / 2.0)
        .sum::<f32>()
        / notes.len() as f32;

    for note in notes.iter_mut() {
        note.position.y = (avg_center_y - note.size.height / 2.0).round();
        note.touch();
    }
}

/// Distributes notes evenly across their total horizontal span.
pub fn distribute_horizontally(notes: &mut [Note]) {
    if notes.len() < 3 {
        return;
    }
    // Sort notes by X position
    notes.sort_by(|a, b| a.position.x.partial_cmp(&b.position.x).unwrap_or(std::cmp::Ordering::Equal));

    let first_x = notes[0].position.x;
    let last_idx = notes.len() - 1;
    let last_right = notes[last_idx].position.x + notes[last_idx].size.width;

    let total_span = last_right - first_x;
    let total_notes_width: f32 = notes.iter().map(|n| n.size.width).sum();

    let mut gap = (total_span - total_notes_width) / (notes.len() - 1) as f32;
    if gap < 24.0 {
        gap = 24.0;
    }

    let mut current_x = first_x;
    for note in notes.iter_mut() {
        note.position.x = current_x.round();
        note.touch();
        current_x += note.size.width + gap;
    }
}

/// Distributes notes evenly across their total vertical span.
pub fn distribute_vertically(notes: &mut [Note]) {
    if notes.len() < 3 {
        return;
    }
    // Sort notes by Y position
    notes.sort_by(|a, b| a.position.y.partial_cmp(&b.position.y).unwrap_or(std::cmp::Ordering::Equal));

    let first_y = notes[0].position.y;
    let last_idx = notes.len() - 1;
    let last_bottom = notes[last_idx].position.y + notes[last_idx].size.height;

    let total_span = last_bottom - first_y;
    let total_notes_height: f32 = notes.iter().map(|n| n.size.height).sum();

    let mut gap = (total_span - total_notes_height) / (notes.len() - 1) as f32;
    if gap < 24.0 {
        gap = 24.0;
    }

    let mut current_y = first_y;
    for note in notes.iter_mut() {
        note.position.y = current_y.round();
        note.touch();
        current_y += note.size.height + gap;
    }
}

/// Arranges notes into a balanced 2D grid matrix snapping to 24px increments.
pub fn arrange_in_grid(notes: &mut [Note]) {
    if notes.len() < 2 {
        return;
    }
    let cols = (notes.len() as f32).sqrt().ceil() as usize;
    let min_x = notes.iter().map(|n| n.position.x).fold(f32::INFINITY, f32::min);
    let min_y = notes.iter().map(|n| n.position.y).fold(f32::INFINITY, f32::min);

    let max_w = notes.iter().map(|n| n.size.width).fold(DEFAULT_NOTE_WIDTH, f32::max);
    let max_h = notes.iter().map(|n| n.size.height).fold(DEFAULT_NOTE_HEIGHT, f32::max);

    let gap_x = 32.0;
    let gap_y = 32.0;

    for (idx, note) in notes.iter_mut().enumerate() {
        let row = (idx / cols) as f32;
        let col = (idx % cols) as f32;

        let mut target_x = min_x + col * (max_w + gap_x);
        let mut target_y = min_y + row * (max_h + gap_y);

        target_x = (target_x / GRID_SIZE).round() * GRID_SIZE;
        target_y = (target_y / GRID_SIZE).round() * GRID_SIZE;

        note.position = Point2D::new(target_x, target_y);
        note.touch();
    }
}

/// Calculates the bounding box for a group of notes with configurable padding.
pub fn calculate_group_bounds(
    group_notes: &[Note],
    padding_x: f32,
    padding_y_top: f32,
    padding_y_bottom: f32,
) -> Rect2D {
    if group_notes.is_empty() {
        return Rect2D::new(0.0, 0.0, 100.0, 100.0);
    }

    let mut min_x = f32::INFINITY;
    let mut min_y = f32::INFINITY;
    let mut max_x = f32::NEG_INFINITY;
    let mut max_y = f32::NEG_INFINITY;

    for note in group_notes {
        min_x = min_x.min(note.position.x);
        min_y = min_y.min(note.position.y);
        max_x = max_x.max(note.position.x + note.size.width);
        max_y = max_y.max(note.position.y + note.size.height);
    }

    let bound_min_x = min_x - padding_x;
    let bound_min_y = min_y - padding_y_top;
    let bound_max_x = max_x + padding_x;
    let bound_max_y = max_y + padding_y_bottom;

    Rect2D::new(bound_min_x, bound_min_y, bound_max_x, bound_max_y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_align_top_and_left() {
        let mut notes = vec![
            Note::new("Note 1", "Body 1", Point2D::new(100.0, 200.0)),
            Note::new("Note 2", "Body 2", Point2D::new(300.0, 150.0)),
            Note::new("Note 3", "Body 3", Point2D::new(50.0, 400.0)),
        ];

        align_top(&mut notes);
        assert_eq!(notes[0].position.y, 150.0);
        assert_eq!(notes[1].position.y, 150.0);
        assert_eq!(notes[2].position.y, 150.0);

        align_left(&mut notes);
        assert_eq!(notes[0].position.x, 50.0);
        assert_eq!(notes[1].position.x, 50.0);
        assert_eq!(notes[2].position.x, 50.0);
    }

    #[test]
    fn test_arrange_in_grid() {
        let mut notes = vec![
            Note::new("Note 1", "Body 1", Point2D::new(0.0, 0.0)),
            Note::new("Note 2", "Body 2", Point2D::new(10.0, 10.0)),
            Note::new("Note 3", "Body 3", Point2D::new(20.0, 20.0)),
            Note::new("Note 4", "Body 4", Point2D::new(30.0, 30.0)),
        ];

        arrange_in_grid(&mut notes);
        // 4 notes -> 2 columns, 2 rows
        assert_eq!(notes[0].position.x, 0.0);
        assert_eq!(notes[0].position.y, 0.0);
        assert!(notes[1].position.x > 0.0);
        assert_eq!(notes[1].position.y, 0.0);
        assert_eq!(notes[2].position.x, 0.0);
        assert!(notes[2].position.y > 0.0);
    }

    #[test]
    fn test_group_bounds() {
        let notes = vec![
            Note::new("Note 1", "Body 1", Point2D::new(100.0, 100.0)),
            Note::new("Note 2", "Body 2", Point2D::new(400.0, 300.0)),
        ];

        let bounds = calculate_group_bounds(&notes, 20.0, 30.0, 20.0);
        assert_eq!(bounds.min_x, 80.0);
        assert_eq!(bounds.min_y, 70.0);
        assert!(bounds.width() > 300.0);
        assert!(bounds.height() > 200.0);
    }
}
