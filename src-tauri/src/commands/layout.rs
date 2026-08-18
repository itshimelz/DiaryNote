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

#[cfg(test)]
mod tests {
    use super::*;

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
}
