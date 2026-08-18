use crate::models::note::{Point2D, Size2D};
use serde::{Deserialize, Serialize};

/// 2D Rectangle defined by min and max corners (AABB)
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rect2D {
    pub min_x: f32,
    pub min_y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

impl Rect2D {
    pub fn new(min_x: f32, min_y: f32, max_x: f32, max_y: f32) -> Self {
        Self {
            min_x: min_x.min(max_x),
            min_y: min_y.min(max_y),
            max_x: min_x.max(max_x),
            max_y: min_y.max(max_y),
        }
    }

    pub fn from_point_and_size(pos: Point2D, size: Size2D) -> Self {
        Self {
            min_x: pos.x,
            min_y: pos.y,
            max_x: pos.x + size.width,
            max_y: pos.y + size.height,
        }
    }

    pub fn width(&self) -> f32 {
        self.max_x - self.min_x
    }

    pub fn height(&self) -> f32 {
        self.max_y - self.min_y
    }

    pub fn center(&self) -> Point2D {
        Point2D::new(
            (self.min_x + self.max_x) * 0.5,
            (self.min_y + self.max_y) * 0.5,
        )
    }

    pub fn contains_point(&self, p: &Point2D) -> bool {
        p.x >= self.min_x && p.x <= self.max_x && p.y >= self.min_y && p.y <= self.max_y
    }

    pub fn intersects(&self, other: &Rect2D) -> bool {
        !(self.max_x < other.min_x
            || self.min_x > other.max_x
            || self.max_y < other.min_y
            || self.min_y > other.max_y)
    }

    pub fn expand(&self, margin: f32) -> Self {
        Self {
            min_x: self.min_x - margin,
            min_y: self.min_y - margin,
            max_x: self.max_x + margin,
            max_y: self.max_y + margin,
        }
    }

    pub fn bounding_box_of(rects: &[Rect2D]) -> Option<Self> {
        if rects.is_empty() {
            return None;
        }

        let mut min_x = f32::INFINITY;
        let mut min_y = f32::INFINITY;
        let mut max_x = f32::NEG_INFINITY;
        let mut max_y = f32::NEG_INFINITY;

        for r in rects {
            min_x = min_x.min(r.min_x);
            min_y = min_y.min(r.min_y);
            max_x = max_x.max(r.max_x);
            max_y = max_y.max(r.max_y);
        }

        Some(Self {
            min_x,
            min_y,
            max_x,
            max_y,
        })
    }
}
