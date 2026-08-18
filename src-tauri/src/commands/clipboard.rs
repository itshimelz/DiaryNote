use crate::error::AppError;
use crate::models::{NotePosition, RelocatedNoteResult};

/// Tauri command to calculate relocated coordinates for cut notes.
/// Computes the cluster center and translates all notes to the target canvas position,
/// preserving relative layout and spacing.
#[tauri::command]
pub fn relocate_notes(
    note_positions: Vec<NotePosition>,
    target_x: f64,
    target_y: f64,
) -> Result<Vec<RelocatedNoteResult>, AppError> {
    if note_positions.is_empty() {
        return Ok(Vec::new());
    }

    // 1. Single note relocation
    if note_positions.len() == 1 {
        return Ok(vec![RelocatedNoteResult {
            id: note_positions[0].id.clone(),
            x: target_x.round(),
            y: target_y.round(),
        }]);
    }

    // 2. Multi-note cluster relocation (preserve relative offsets)
    let min_x = note_positions
        .iter()
        .map(|n| n.x)
        .fold(f64::INFINITY, f64::min);
    let max_x = note_positions
        .iter()
        .map(|n| n.x)
        .fold(f64::NEG_INFINITY, f64::max);
    let min_y = note_positions
        .iter()
        .map(|n| n.y)
        .fold(f64::INFINITY, f64::min);
    let max_y = note_positions
        .iter()
        .map(|n| n.y)
        .fold(f64::NEG_INFINITY, f64::max);

    let cluster_center_x = (min_x + max_x) / 2.0;
    let cluster_center_y = (min_y + max_y) / 2.0;

    let delta_x = target_x - cluster_center_x;
    let delta_y = target_y - cluster_center_y;

    let results = note_positions
        .into_iter()
        .map(|n| RelocatedNoteResult {
            id: n.id,
            x: (n.x + delta_x).round(),
            y: (n.y + delta_y).round(),
        })
        .collect();

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relocate_single_note() {
        let notes = vec![NotePosition {
            id: "note-1".to_string(),
            x: 100.0,
            y: 200.0,
        }];
        let res = relocate_notes(notes, 500.0, 800.0).unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].id, "note-1");
        assert_eq!(res[0].x, 500.0);
        assert_eq!(res[0].y, 800.0);
    }

    #[test]
    fn test_relocate_multiple_notes_preserves_relative_spacing() {
        let notes = vec![
            NotePosition {
                id: "note-1".to_string(),
                x: 0.0,
                y: 0.0,
            },
            NotePosition {
                id: "note-2".to_string(),
                x: 100.0,
                y: 0.0,
            },
        ];
        // Cluster center is at (50, 0).
        // Target is (1000, 2000).
        // delta_x = 950, delta_y = 2000.
        let res = relocate_notes(notes, 1000.0, 2000.0).unwrap();
        assert_eq!(res.len(), 2);
        assert_eq!(res[0].id, "note-1");
        assert_eq!(res[0].x, 950.0);
        assert_eq!(res[0].y, 2000.0);

        assert_eq!(res[1].id, "note-2");
        assert_eq!(res[1].x, 1050.0);
        assert_eq!(res[1].y, 2000.0);

        // Distance between them remains exactly 100px
        assert_eq!(res[1].x - res[0].x, 100.0);
    }
}
