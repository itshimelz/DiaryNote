use serde::{Deserialize, Serialize};
use ts_rs::TS;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct NoteLayoutInput {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub width: Option<f64>,
    pub height: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct NoteLayoutOutput {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct WorldFrustumInput {
    pub min_x: f64,
    pub max_x: f64,
    pub min_y: f64,
    pub max_y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct DragPositionDelta {
    pub id: String,
    pub start_x: f64,
    pub start_y: f64,
}

const DEFAULT_WIDTH: f64 = 280.0;
const DEFAULT_HEIGHT: f64 = 340.0;
const GRID_SIZE: f64 = 20.0;

/// Tauri command to compute batch note alignments and grid packing in native Rust.
#[tauri::command]
pub fn compute_batch_layout(
    notes: Vec<NoteLayoutInput>,
    mode: String,
    spacing: Option<f64>,
) -> Result<Vec<NoteLayoutOutput>, AppError> {
    if notes.is_empty() {
        return Ok(Vec::new());
    }

    let gap = spacing.unwrap_or(30.0);

    match mode.to_lowercase().as_str() {
        "align-left" => {
            let min_x = notes.iter().map(|n| n.x).fold(f64::INFINITY, f64::min);
            Ok(notes.into_iter().map(|n| NoteLayoutOutput { id: n.id, x: min_x, y: n.y }).collect())
        }
        "align-center-h" => {
            let count = notes.len() as f64;
            let avg_center_x = notes
                .iter()
                .map(|n| n.x + n.width.unwrap_or(DEFAULT_WIDTH) / 2.0)
                .sum::<f64>()
                / count;
            Ok(notes
                .into_iter()
                .map(|n| {
                    let w = n.width.unwrap_or(DEFAULT_WIDTH);
                    NoteLayoutOutput {
                        id: n.id,
                        x: (avg_center_x - w / 2.0).round(),
                        y: n.y,
                    }
                })
                .collect())
        }
        "align-right" => {
            let max_right = notes
                .iter()
                .map(|n| n.x + n.width.unwrap_or(DEFAULT_WIDTH))
                .fold(f64::NEG_INFINITY, f64::max);
            Ok(notes
                .into_iter()
                .map(|n| {
                    let w = n.width.unwrap_or(DEFAULT_WIDTH);
                    NoteLayoutOutput {
                        id: n.id,
                        x: (max_right - w).round(),
                        y: n.y,
                    }
                })
                .collect())
        }
        "align-top" => {
            let min_y = notes.iter().map(|n| n.y).fold(f64::INFINITY, f64::min);
            Ok(notes.into_iter().map(|n| NoteLayoutOutput { id: n.id, x: n.x, y: min_y }).collect())
        }
        "align-center-v" => {
            let count = notes.len() as f64;
            let avg_center_y = notes
                .iter()
                .map(|n| n.y + n.height.unwrap_or(DEFAULT_HEIGHT) / 2.0)
                .sum::<f64>()
                / count;
            Ok(notes
                .into_iter()
                .map(|n| {
                    let h = n.height.unwrap_or(DEFAULT_HEIGHT);
                    NoteLayoutOutput {
                        id: n.id,
                        x: n.x,
                        y: (avg_center_y - h / 2.0).round(),
                    }
                })
                .collect())
        }
        "align-bottom" => {
            let max_bottom = notes
                .iter()
                .map(|n| n.y + n.height.unwrap_or(DEFAULT_HEIGHT))
                .fold(f64::NEG_INFINITY, f64::max);
            Ok(notes
                .into_iter()
                .map(|n| {
                    let h = n.height.unwrap_or(DEFAULT_HEIGHT);
                    NoteLayoutOutput {
                        id: n.id,
                        x: n.x,
                        y: (max_bottom - h).round(),
                    }
                })
                .collect())
        }
        "distribute-h" => {
            if notes.len() < 3 {
                return Ok(notes.into_iter().map(|n| NoteLayoutOutput { id: n.id, x: n.x, y: n.y }).collect());
            }
            let mut sorted = notes;
            sorted.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));
            let start_x = sorted.first().unwrap().x;
            let last_note = sorted.last().unwrap();
            let end_x = last_note.x + last_note.width.unwrap_or(DEFAULT_WIDTH);
            let total_width: f64 = sorted.iter().map(|n| n.width.unwrap_or(DEFAULT_WIDTH)).sum();
            let total_space = end_x - start_x - total_width;
            let step_gap = (total_space / (sorted.len() - 1) as f64).max(10.0);

            let mut curr_x = start_x;
            let mut out = Vec::new();
            for n in sorted {
                out.push(NoteLayoutOutput { id: n.id.clone(), x: curr_x.round(), y: n.y });
                curr_x += n.width.unwrap_or(DEFAULT_WIDTH) + step_gap;
            }
            Ok(out)
        }
        "distribute-v" => {
            if notes.len() < 3 {
                return Ok(notes.into_iter().map(|n| NoteLayoutOutput { id: n.id, x: n.x, y: n.y }).collect());
            }
            let mut sorted = notes;
            sorted.sort_by(|a, b| a.y.partial_cmp(&b.y).unwrap_or(std::cmp::Ordering::Equal));
            let start_y = sorted.first().unwrap().y;
            let last_note = sorted.last().unwrap();
            let end_y = last_note.y + last_note.height.unwrap_or(DEFAULT_HEIGHT);
            let total_height: f64 = sorted.iter().map(|n| n.height.unwrap_or(DEFAULT_HEIGHT)).sum();
            let total_space = end_y - start_y - total_height;
            let step_gap = (total_space / (sorted.len() - 1) as f64).max(10.0);

            let mut curr_y = start_y;
            let mut out = Vec::new();
            for n in sorted {
                out.push(NoteLayoutOutput { id: n.id.clone(), x: n.x, y: curr_y.round() });
                curr_y += n.height.unwrap_or(DEFAULT_HEIGHT) + step_gap;
            }
            Ok(out)
        }
        "pack-grid" => {
            let count = notes.len();
            let cols = (count as f64).sqrt().ceil() as usize;
            let start_x = notes.iter().map(|n| n.x).fold(f64::INFINITY, f64::min);
            let start_y = notes.iter().map(|n| n.y).fold(f64::INFINITY, f64::min);

            let mut out = Vec::new();
            let mut row_max_height = 0.0;
            let mut curr_x = start_x;
            let mut curr_y = start_y;

            for (i, n) in notes.into_iter().enumerate() {
                let w = n.width.unwrap_or(DEFAULT_WIDTH);
                let h = n.height.unwrap_or(DEFAULT_HEIGHT);

                if i > 0 && i % cols == 0 {
                    curr_x = start_x;
                    curr_y += row_max_height + gap;
                    row_max_height = 0.0;
                }

                out.push(NoteLayoutOutput {
                    id: n.id,
                    x: curr_x.round(),
                    y: curr_y.round(),
                });

                curr_x += w + gap;
                if h > row_max_height {
                    row_max_height = h;
                }
            }
            Ok(out)
        }
        "snap-to-grid" => Ok(notes
            .into_iter()
            .map(|n| NoteLayoutOutput {
                id: n.id,
                x: (n.x / GRID_SIZE).round() * GRID_SIZE,
                y: (n.y / GRID_SIZE).round() * GRID_SIZE,
            })
            .collect()),
        _ => Err(AppError::Validation(format!("Unsupported layout mode: {}", mode))),
    }
}

/// Direction for spatial navigation between cards on the 2D canvas
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub enum SpatialDirection {
    Left,
    Right,
    Up,
    Down,
}

/// Finds the geometrically nearest note card in the given cardinal direction relative to `current_note_id`.
#[tauri::command]
pub fn find_nearest_spatial_note(
    current_note_id: String,
    direction: String,
    notes: Vec<NoteLayoutInput>,
) -> Result<Option<String>, AppError> {
    if notes.is_empty() {
        return Ok(None);
    }

    let dir = match direction.to_lowercase().as_str() {
        "left" => SpatialDirection::Left,
        "right" => SpatialDirection::Right,
        "up" => SpatialDirection::Up,
        "down" => SpatialDirection::Down,
        _ => return Err(AppError::Validation(format!("Invalid spatial direction: {}", direction))),
    };

    let origin = match notes.iter().find(|n| n.id == current_note_id) {
        Some(n) => n,
        None => return Ok(None),
    };

    let o_w = origin.width.unwrap_or(DEFAULT_WIDTH);
    let o_h = origin.height.unwrap_or(DEFAULT_HEIGHT);
    let o_cx = origin.x + o_w / 2.0;
    let o_cy = origin.y + o_h / 2.0;
    let o_min_x = origin.x;
    let o_max_x = origin.x + o_w;
    let o_min_y = origin.y;
    let o_max_y = origin.y + o_h;

    let mut best_id = None;
    let mut best_score = f64::INFINITY;

    for candidate in &notes {
        if candidate.id == current_note_id {
            continue;
        }

        let c_w = candidate.width.unwrap_or(DEFAULT_WIDTH);
        let c_h = candidate.height.unwrap_or(DEFAULT_HEIGHT);
        let c_cx = candidate.x + c_w / 2.0;
        let c_cy = candidate.y + c_h / 2.0;
        let c_min_x = candidate.x;
        let c_max_x = candidate.x + c_w;
        let c_min_y = candidate.y;
        let c_max_y = candidate.y + c_h;

        let (d_primary, gap_orthogonal, d_secondary_center) = match dir {
            SpatialDirection::Right => {
                let is_forward = c_cx > o_cx || (c_max_x > o_max_x && c_min_x >= o_min_x);
                if !is_forward {
                    continue;
                }
                let primary = if c_min_x >= o_max_x {
                    c_min_x - o_max_x
                } else {
                    (c_cx - o_cx).max(1.0)
                };
                let gap_y = (o_min_y.max(c_min_y) - o_max_y.min(c_max_y)).max(0.0);
                let dy = (c_cy - o_cy).abs();
                (primary, gap_y, dy)
            }
            SpatialDirection::Left => {
                let is_forward = c_cx < o_cx || (c_min_x < o_min_x && c_max_x <= o_max_x);
                if !is_forward {
                    continue;
                }
                let primary = if c_max_x <= o_min_x {
                    o_min_x - c_max_x
                } else {
                    (o_cx - c_cx).max(1.0)
                };
                let gap_y = (o_min_y.max(c_min_y) - o_max_y.min(c_max_y)).max(0.0);
                let dy = (c_cy - o_cy).abs();
                (primary, gap_y, dy)
            }
            SpatialDirection::Down => {
                let is_forward = c_cy > o_cy || (c_max_y > o_max_y && c_min_y >= o_min_y);
                if !is_forward {
                    continue;
                }
                let primary = if c_min_y >= o_max_y {
                    c_min_y - o_max_y
                } else {
                    (c_cy - o_cy).max(1.0)
                };
                let gap_x = (o_min_x.max(c_min_x) - o_max_x.min(c_max_x)).max(0.0);
                let dx = (c_cx - o_cx).abs();
                (primary, gap_x, dx)
            }
            SpatialDirection::Up => {
                let is_forward = c_cy < o_cy || (c_min_y < o_min_y && c_max_y <= o_max_y);
                if !is_forward {
                    continue;
                }
                let primary = if c_max_y <= o_min_y {
                    o_min_y - c_max_y
                } else {
                    (o_cy - c_cy).max(1.0)
                };
                let gap_x = (o_min_x.max(c_min_x) - o_max_x.min(c_max_x)).max(0.0);
                let dx = (c_cx - o_cx).abs();
                (primary, gap_x, dx)
            }
        };

        // Standard spatial navigation score: primary distance + 3x orthogonal gap penalty + 0.5x center distance
        let score = d_primary + 3.0 * gap_orthogonal + 0.5 * d_secondary_center;

        if score < best_score {
            best_score = score;
            best_id = Some(candidate.id.clone());
        }
    }

    Ok(best_id)
}

/// Native Rust 2D AABB spatial intersection query for viewport culling
#[tauri::command]
pub fn cull_notes_in_frustum(
    notes: Vec<NoteLayoutInput>,
    frustum: WorldFrustumInput,
) -> Result<Vec<String>, AppError> {
    let mut visible_ids = Vec::with_capacity(notes.len());
    for n in &notes {
        let w = n.width.unwrap_or(DEFAULT_WIDTH);
        let h = n.height.unwrap_or(DEFAULT_HEIGHT);
        let note_min_x = n.x;
        let note_max_x = n.x + w;
        let note_min_y = n.y;
        let note_max_y = n.y + h;

        // 2D Axis-Aligned Bounding Box (AABB) intersection
        let intersects = note_max_x >= frustum.min_x
            && note_min_x <= frustum.max_x
            && note_max_y >= frustum.min_y
            && note_min_y <= frustum.max_y;

        if intersects {
            visible_ids.push(n.id.clone());
        }
    }
    Ok(visible_ids)
}

/// Computes final snapped coordinates for multi-note drag completion in microsecond native Rust
#[tauri::command]
pub fn compute_batch_drag_snapping(
    items: Vec<DragPositionDelta>,
    delta_x: f64,
    delta_y: f64,
    snap_to_grid: bool,
    grid_size: Option<f64>,
) -> Result<Vec<NoteLayoutOutput>, AppError> {
    let grid = grid_size.unwrap_or(GRID_SIZE);
    let mut results = Vec::with_capacity(items.len());

    for item in items {
        let raw_x = item.start_x + delta_x;
        let raw_y = item.start_y + delta_y;
        let final_x = if snap_to_grid {
            (raw_x / grid).round() * grid
        } else {
            raw_x.round()
        };
        let final_y = if snap_to_grid {
            (raw_y / grid).round() * grid
        } else {
            raw_y.round()
        };
        results.push(NoteLayoutOutput {
            id: item.id,
            x: final_x,
            y: final_y,
        });
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cull_notes_in_frustum() {
        let notes = vec![
            NoteLayoutInput { id: "inside".into(), x: 100.0, y: 100.0, width: Some(200.0), height: Some(200.0) },
            NoteLayoutInput { id: "outside".into(), x: 2000.0, y: 2000.0, width: Some(200.0), height: Some(200.0) },
            NoteLayoutInput { id: "overlapping".into(), x: 450.0, y: 100.0, width: Some(100.0), height: Some(100.0) },
        ];
        let frustum = WorldFrustumInput {
            min_x: 0.0,
            max_x: 500.0,
            min_y: 0.0,
            max_y: 500.0,
        };
        let visible = cull_notes_in_frustum(notes, frustum).unwrap();
        assert_eq!(visible.len(), 2);
        assert!(visible.contains(&"inside".to_string()));
        assert!(visible.contains(&"overlapping".to_string()));
        assert!(!visible.contains(&"outside".to_string()));
    }

    #[test]
    fn test_compute_batch_drag_snapping() {
        let items = vec![
            DragPositionDelta { id: "n1".into(), start_x: 10.0, start_y: 10.0 },
            DragPositionDelta { id: "n2".into(), start_x: 100.0, start_y: 100.0 },
        ];
        let res = compute_batch_drag_snapping(items, 15.0, 25.0, true, Some(20.0)).unwrap();
        assert_eq!(res.len(), 2);
        assert_eq!(res[0].x, 20.0); // 10 + 15 = 25 -> 20
        assert_eq!(res[0].y, 40.0); // 10 + 25 = 35 -> 40
        assert_eq!(res[1].x, 120.0); // 100 + 15 = 115 -> 120
        assert_eq!(res[1].y, 120.0); // 100 + 25 = 125 -> 120
    }

    #[test]
    fn test_compute_batch_layout_align_left() {
        let notes = vec![
            NoteLayoutInput { id: "n1".into(), x: 100.0, y: 50.0, width: Some(200.0), height: Some(300.0) },
            NoteLayoutInput { id: "n2".into(), x: 300.0, y: 150.0, width: Some(200.0), height: Some(300.0) },
        ];
        let res = compute_batch_layout(notes, "align-left".into(), None).unwrap();
        assert_eq!(res.len(), 2);
        assert_eq!(res[0].x, 100.0);
        assert_eq!(res[1].x, 100.0);
    }

    #[test]
    fn test_compute_batch_layout_pack_grid() {
        let notes = vec![
            NoteLayoutInput { id: "n1".into(), x: 10.0, y: 10.0, width: Some(100.0), height: Some(100.0) },
            NoteLayoutInput { id: "n2".into(), x: 20.0, y: 20.0, width: Some(100.0), height: Some(100.0) },
            NoteLayoutInput { id: "n3".into(), x: 30.0, y: 30.0, width: Some(100.0), height: Some(100.0) },
            NoteLayoutInput { id: "n4".into(), x: 40.0, y: 40.0, width: Some(100.0), height: Some(100.0) },
        ];
        let res = compute_batch_layout(notes, "pack-grid".into(), Some(20.0)).unwrap();
        assert_eq!(res.len(), 4);
        assert_eq!(res[0].x, 10.0);
        assert_eq!(res[0].y, 10.0);
        assert_eq!(res[1].x, 130.0);
        assert_eq!(res[1].y, 10.0);
        assert_eq!(res[2].x, 10.0);
        assert_eq!(res[2].y, 130.0);
    }

    #[test]
    fn test_find_nearest_spatial_note_cardinal_directions() {
        let notes = vec![
            // Origin at center (500, 500)
            NoteLayoutInput { id: "origin".into(), x: 500.0, y: 500.0, width: Some(200.0), height: Some(200.0) },
            // Right neighbor (800, 500)
            NoteLayoutInput { id: "right_node".into(), x: 800.0, y: 500.0, width: Some(200.0), height: Some(200.0) },
            // Left neighbor (200, 500)
            NoteLayoutInput { id: "left_node".into(), x: 200.0, y: 500.0, width: Some(200.0), height: Some(200.0) },
            // Below neighbor (500, 800)
            NoteLayoutInput { id: "down_node".into(), x: 500.0, y: 800.0, width: Some(200.0), height: Some(200.0) },
            // Above neighbor (500, 200)
            NoteLayoutInput { id: "up_node".into(), x: 500.0, y: 200.0, width: Some(200.0), height: Some(200.0) },
            // Diagonal far node
            NoteLayoutInput { id: "diag_node".into(), x: 800.0, y: 800.0, width: Some(200.0), height: Some(200.0) },
        ];

        let right = find_nearest_spatial_note("origin".into(), "right".into(), notes.clone()).unwrap();
        assert_eq!(right, Some("right_node".to_string()));

        let left = find_nearest_spatial_note("origin".into(), "left".into(), notes.clone()).unwrap();
        assert_eq!(left, Some("left_node".to_string()));

        let down = find_nearest_spatial_note("origin".into(), "down".into(), notes.clone()).unwrap();
        assert_eq!(down, Some("down_node".to_string()));

        let up = find_nearest_spatial_note("origin".into(), "up".into(), notes.clone()).unwrap();
        assert_eq!(up, Some("up_node".to_string()));
    }
}
