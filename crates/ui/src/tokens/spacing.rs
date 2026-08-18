//! 4px grid spacing scale and padding primitives.

use serde::{Deserialize, Serialize};

pub const SPACE_0: f32 = 0.0;
pub const SPACE_1: f32 = 4.0;
pub const SPACE_1_5: f32 = 6.0;
pub const SPACE_2: f32 = 8.0;
pub const SPACE_2_5: f32 = 10.0;
pub const SPACE_3: f32 = 12.0;
pub const SPACE_3_5: f32 = 14.0;
pub const SPACE_4: f32 = 16.0;
pub const SPACE_5: f32 = 20.0;
pub const SPACE_6: f32 = 24.0;
pub const SPACE_7: f32 = 28.0;
pub const SPACE_8: f32 = 32.0;
pub const SPACE_10: f32 = 40.0;
pub const SPACE_12: f32 = 48.0;

/// Padding specification for containers
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub struct Padding {
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub left: f32,
}

impl Padding {
    pub const ZERO: Self = Self::uniform(0.0);

    pub const fn uniform(val: f32) -> Self {
        Self {
            top: val,
            right: val,
            bottom: val,
            left: val,
        }
    }

    pub const fn symmetric(vertical: f32, horizontal: f32) -> Self {
        Self {
            top: vertical,
            right: horizontal,
            bottom: vertical,
            left: horizontal,
        }
    }

    pub const fn trbl(top: f32, right: f32, bottom: f32, left: f32) -> Self {
        Self {
            top,
            right,
            bottom,
            left,
        }
    }
}
