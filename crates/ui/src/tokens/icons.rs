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
    Alert,
    Info,
    Refresh,
    ExternalLink,
    Filter,
    Paperclip,
    Smile,
    FolderPlus,
    Maximize,
    Minimize,
    Keyboard,
    Loading,
}

impl IconKind {
    pub const fn name(&self) -> &'static str {
        match self {
            Self::Keyboard => "⌨",
            Self::Loading => "⏳",
            Self::Add => "+",
            Self::Search => "🔍",
            Self::Trash => "🗑",
            Self::SecurityLock => "🔒",
            Self::Key => "🔑",
            Self::Pin => "📌",
            Self::Unpin => "📍",
            Self::Copy => "📋",
            Self::Edit => "✏",
            Self::Close => "✕",
            Self::Check => "✓",
            Self::Settings => "⚙",
            Self::Sun => "☀",
            Self::Moon => "🌙",
            Self::Calendar => "📅",
            Self::Sparkles => "✨",
            Self::Fire => "🔥",
            Self::ChevronDown => "▼",
            Self::ChevronUp => "▲",
            Self::ChevronLeft => "◀",
            Self::ChevronRight => "▶",
            Self::Eye => "👁",
            Self::EyeOff => "🚫",
            Self::Share => "↗",
            Self::MoreVertical => "⋮",
            Self::MoreHorizontal => "…",
            Self::Tag => "🏷",
            Self::Folder => "📁",
            Self::Undo => "↺",
            Self::Redo => "↻",
            Self::ZoomIn => "+",
            Self::ZoomOut => "-",
            Self::Grid => "▦",
            Self::AlignCenter => "⇥",
            Self::AlignTop => "⤒",
            Self::Layout => "▤",
            Self::Download => "↓",
            Self::Upload => "↑",
            Self::AlertTriangle | Self::Alert => "⚠",
            Self::InformationCircle | Self::Info => "ℹ",
            Self::HelpCircle => "?",
            Self::Refresh => "↻",
            Self::ExternalLink => "↗",
            Self::Filter => "☵",
            Self::Paperclip => "📎",
            Self::Smile => "😊",
            Self::FolderPlus => "📁+",
            Self::Maximize => "🗖",
            Self::Minimize => "🗕",
        }
    }
}
