use crate::error::{DomainError, DomainResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use uuid::Uuid;

/// Strongly typed Unique Identifier for a Note
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct NoteId(pub Uuid);

impl NoteId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for NoteId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for NoteId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for NoteId {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(NoteId)
            .map_err(|e| DomainError::Validation(format!("Invalid UUID for NoteId: {e}")))
    }
}

/// 2D Floating Point Coordinate
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f32,
    pub y: f32,
}

impl Point2D {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };

    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    pub fn distance_to(&self, other: &Point2D) -> f32 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }

    pub fn offset(&self, dx: f32, dy: f32) -> Self {
        Self {
            x: self.x + dx,
            y: self.y + dy,
        }
    }
}

/// 2D Dimensions (Width & Height) with positive constraints
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Size2D {
    pub width: f32,
    pub height: f32,
}

impl Size2D {
    pub const DEFAULT_NOTE: Self = Self {
        width: 280.0,
        height: 200.0,
    };
    pub const MIN_WIDTH: f32 = 180.0;
    pub const MIN_HEIGHT: f32 = 120.0;

    pub fn new(width: f32, height: f32) -> DomainResult<Self> {
        if width <= 0.0 || height <= 0.0 {
            return Err(DomainError::InvalidBounds { width, height });
        }
        Ok(Self {
            width: width.max(Self::MIN_WIDTH),
            height: height.max(Self::MIN_HEIGHT),
        })
    }

    pub fn new_unchecked(width: f32, height: f32) -> Self {
        Self {
            width: width.max(Self::MIN_WIDTH),
            height: height.max(Self::MIN_HEIGHT),
        }
    }
}

/// Color theme palette for notes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ColorTheme {
    #[default]
    Default,
    Amber,
    Emerald,
    Rose,
    Sky,
    Violet,
    Slate,
}

impl ColorTheme {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Default => "default",
            Self::Amber => "amber",
            Self::Emerald => "emerald",
            Self::Rose => "rose",
            Self::Sky => "sky",
            Self::Violet => "violet",
            Self::Slate => "slate",
        }
    }

    pub fn from_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "amber" => Self::Amber,
            "emerald" => Self::Emerald,
            "rose" => Self::Rose,
            "sky" => Self::Sky,
            "violet" => Self::Violet,
            "slate" => Self::Slate,
            _ => Self::Default,
        }
    }
}

/// Daily entry / note mood indicator
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Mood {
    #[default]
    None,
    Great,
    Good,
    Neutral,
    Bad,
    Terrible,
}

/// Note typography font family
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FontFamily {
    #[default]
    Sans,
    Serif,
    Mono,
    Handwriting,
}

/// Interactive checklist item inside a note
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChecklistItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
    pub order: i32,
}

impl ChecklistItem {
    pub fn new(text: impl Into<String>, order: i32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            text: text.into(),
            completed: false,
            order,
        }
    }
}

/// The core Note domain entity
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Note {
    pub id: NoteId,
    pub title: String,
    pub body: String,
    pub position: Point2D,
    pub size: Size2D,
    pub color_theme: ColorTheme,
    pub mood: Mood,
    pub font_family: FontFamily,
    pub is_locked: bool,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub is_daily_entry: bool,
    pub entry_date: Option<String>,
    pub z_index: i32,
    pub group_id: Option<String>,
    pub tags: Vec<String>,
    pub checklist: Vec<ChecklistItem>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Note {
    pub fn new(title: impl Into<String>, body: impl Into<String>, position: Point2D) -> Self {
        let now = Utc::now();
        Self {
            id: NoteId::new(),
            title: title.into(),
            body: body.into(),
            position,
            size: Size2D::DEFAULT_NOTE,
            color_theme: ColorTheme::Default,
            mood: Mood::None,
            font_family: FontFamily::Sans,
            is_locked: false,
            is_pinned: false,
            is_favorite: false,
            is_archived: false,
            is_daily_entry: false,
            entry_date: None,
            z_index: 0,
            group_id: None,
            tags: Vec::new(),
            checklist: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Duplicate this note with a new unique NoteId and a spatial offset
    pub fn clone_as_duplicate(&self, offset_x: f32, offset_y: f32) -> Self {
        let now = Utc::now();
        Self {
            id: NoteId::new(),
            title: format!("{} (Copy)", self.title),
            body: self.body.clone(),
            position: Point2D::new(self.position.x + offset_x, self.position.y + offset_y),
            size: self.size,
            color_theme: self.color_theme,
            mood: self.mood,
            font_family: self.font_family,
            is_locked: false, // Locked status is not preserved on duplicate for safety
            is_pinned: self.is_pinned,
            is_favorite: self.is_favorite,
            is_archived: false,
            is_daily_entry: false,
            entry_date: None,
            z_index: self.z_index + 1,
            group_id: self.group_id.clone(),
            tags: self.tags.clone(),
            checklist: self.checklist.clone(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Returns the Axis-Aligned Bounding Box (AABB) (min_x, min_y, max_x, max_y)
    pub fn aabb(&self) -> (f32, f32, f32, f32) {
        (
            self.position.x,
            self.position.y,
            self.position.x + self.size.width,
            self.position.y + self.size.height,
        )
    }

    /// Checks if this note intersects with a target bounding rectangle (e.g. marquee selection)
    pub fn intersects_rect(&self, min_x: f32, min_y: f32, max_x: f32, max_y: f32) -> bool {
        let (n_min_x, n_min_y, n_max_x, n_max_y) = self.aabb();
        !(n_max_x < min_x || n_min_x > max_x || n_max_y < min_y || n_min_y > max_y)
    }

    /// Checks if a 2D point is contained inside this note's bounds
    pub fn contains_point(&self, point: &Point2D) -> bool {
        let (min_x, min_y, max_x, max_y) = self.aabb();
        point.x >= min_x && point.x <= max_x && point.y >= min_y && point.y <= max_y
    }
}
