//! Note card decoration tokens: Washi Tapes and Pushpins.

use super::colors::Rgba;
use serde::{Deserialize, Serialize};

/// Washi tape configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WashiTapeToken {
    pub id: &'static str,
    pub label: &'static str,
    pub short_label: &'static str,
    pub color: Rgba,
    pub is_classic: bool,
}

pub const WASHI_TAPES: &[WashiTapeToken] = &[
    WashiTapeToken {
        id: "tape-teal",
        label: "Classic Teal",
        short_label: "C-Teal",
        color: Rgba::new(0.176, 0.831, 0.749, 0.7),
        is_classic: true,
    },
    WashiTapeToken {
        id: "tape-pink",
        label: "Classic Pink",
        short_label: "C-Pink",
        color: Rgba::new(0.957, 0.447, 0.714, 0.7),
        is_classic: true,
    },
    WashiTapeToken {
        id: "tape-beige",
        label: "Classic Beige",
        short_label: "C-Beige",
        color: Rgba::new(0.839, 0.769, 0.659, 0.7),
        is_classic: true,
    },
    WashiTapeToken {
        id: "tape-yellow",
        label: "Classic Yellow",
        short_label: "C-Yellow",
        color: Rgba::new(0.988, 0.827, 0.302, 0.7),
        is_classic: true,
    },
    WashiTapeToken {
        id: "tape-01-hearts-coral",
        label: "Coral Hearts",
        short_label: "Hearts",
        color: Rgba::new(0.953, 0.655, 0.612, 1.0),
        is_classic: false,
    },
    WashiTapeToken {
        id: "tape-02-diagonal-wave-pink",
        label: "Pink Waves",
        short_label: "Waves",
        color: Rgba::new(0.953, 0.745, 0.867, 1.0),
        is_classic: false,
    },
    WashiTapeToken {
        id: "tape-03-gingham-peach",
        label: "Peach Gingham",
        short_label: "Gingham",
        color: Rgba::new(0.965, 0.765, 0.604, 1.0),
        is_classic: false,
    },
    WashiTapeToken {
        id: "tape-04-butterflies-lavender",
        label: "Lavender Butterflies",
        short_label: "Butterflies",
        color: Rgba::new(0.776, 0.702, 0.918, 1.0),
        is_classic: false,
    },
    WashiTapeToken {
        id: "tape-05-waves-dots-mint",
        label: "Mint Ripples",
        short_label: "Mint",
        color: Rgba::new(0.651, 0.890, 0.769, 1.0),
        is_classic: false,
    },
    WashiTapeToken {
        id: "tape-06-stars-taupe",
        label: "Taupe Stars",
        short_label: "Taupe",
        color: Rgba::new(0.639, 0.612, 0.576, 1.0),
        is_classic: false,
    },
    WashiTapeToken {
        id: "tape-07-vertical-waves-blue",
        label: "Sky Stripes",
        short_label: "Sky",
        color: Rgba::new(0.561, 0.839, 0.918, 1.0),
        is_classic: false,
    },
];

/// Pushpin color configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PushpinToken {
    pub id: &'static str,
    pub label: &'static str,
    pub short_label: &'static str,
    pub main: Rgba,
    pub light: Rgba,
    pub dark: Rgba,
}

pub const PUSHPINS: &[PushpinToken] = &[
    PushpinToken {
        id: "pushpin-red",
        label: "Red Pin",
        short_label: "Red",
        main: Rgba::new(0.863, 0.149, 0.149, 1.0),
        light: Rgba::new(0.988, 0.647, 0.647, 1.0),
        dark: Rgba::new(0.600, 0.106, 0.106, 1.0),
    },
    PushpinToken {
        id: "pushpin-blue",
        label: "Blue Pin",
        short_label: "Blue",
        main: Rgba::new(0.145, 0.388, 0.922, 1.0),
        light: Rgba::new(0.576, 0.773, 0.992, 1.0),
        dark: Rgba::new(0.118, 0.251, 0.686, 1.0),
    },
    PushpinToken {
        id: "pushpin-yellow",
        label: "Yellow Pin",
        short_label: "Yellow",
        main: Rgba::new(0.918, 0.702, 0.031, 1.0),
        light: Rgba::new(0.996, 0.941, 0.541, 1.0),
        dark: Rgba::new(0.631, 0.384, 0.027, 1.0),
    },
    PushpinToken {
        id: "pushpin-green",
        label: "Green Pin",
        short_label: "Green",
        main: Rgba::new(0.020, 0.588, 0.412, 1.0),
        light: Rgba::new(0.431, 0.906, 0.718, 1.0),
        dark: Rgba::new(0.024, 0.373, 0.275, 1.0),
    },
];

pub fn get_washi_tape_by_id(id: &str) -> Option<&'static WashiTapeToken> {
    WASHI_TAPES.iter().find(|t| t.id == id)
}

pub fn get_pushpin_by_id(id: &str) -> Option<&'static PushpinToken> {
    PUSHPINS.iter().find(|p| p.id == id)
}
