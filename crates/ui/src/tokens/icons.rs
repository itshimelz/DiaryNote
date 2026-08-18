//! Vector icon enumeration, standard stroke weight (1.5px), and pixel size mappings.
//!
//! Directly mirrors Hugeicons stroke weight and scale used across DiaryNote.

use serde::{Deserialize, Serialize};

/// Standard Icon Stroke Width in logical pixels (Hugeicons standard)
pub const DEFAULT_ICON_STROKE_WIDTH: f32 = 1.5;

/// Icon pixel size scale
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum IconSize {
    Xs, // 14px
    #[default]
    Sm, // 16px
    Md, // 18px
    Lg, // 20px
    Xl, // 22px
}

impl IconSize {
    pub const fn to_pixels(&self) -> f32 {
        match self {
            Self::Xs => 14.0,
            Self::Sm => 16.0,
            Self::Md => 18.0,
            Self::Lg => 20.0,
            Self::Xl => 22.0,
        }
    }
}

/// Enumeration of all UI vector icons used in DiaryNote
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum IconKind {
    Add,
    Search,
    Trash,
    SecurityLock,
    Key,
    Pin,
    Unpin,
    Copy,
    Edit,
    Close,
    Check,
    Settings,
    Sun,
    Moon,
    Calendar,
    Sparkles,
    Fire,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Share,
    MoreVertical,
    MoreHorizontal,
    Tag,
    Folder,
    Undo,
    Redo,
    ZoomIn,
    ZoomOut,
    Grid,
    AlignCenter,
    AlignTop,
    Layout,
    Download,
    Upload,
    AlertTriangle,
    InformationCircle,
    HelpCircle,
    Loading,
    Keyboard,
    Refresh,
    ExternalLink,
    Filter,
    Paperclip,
    Smile,
    FolderPlus,
    Maximize,
    Minimize,
}
