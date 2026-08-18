//! Typography design tokens, font scales, weights, and handwriting font mappings.

use serde::{Deserialize, Serialize};

/// Supported Note Card Font Family
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum HandFont {
    #[default]
    Sans,
    Caveat,
    Kalam,
    Patrick,
    Architect,
    Mono,
    Hind,
    Anek,
    #[serde(rename = "noto-bengali")]
    NotoBengali,
}

impl HandFont {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Sans => "Google Sans Flex (Default)",
            Self::Caveat => "Caveat (Cursive)",
            Self::Kalam => "Kalam (Handwriting)",
            Self::Patrick => "Patrick Hand",
            Self::Architect => "Architects Daughter",
            Self::Mono => "Monospace",
            Self::Hind => "Hind Siliguri (বাংলা)",
            Self::Anek => "Anek Bangla (বাংলা)",
            Self::NotoBengali => "Noto Serif (বাংলা)",
        }
    }

    pub fn family_str(&self) -> &'static str {
        match self {
            Self::Sans => "Google Sans Flex, system-ui, -apple-system, sans-serif",
            Self::Caveat => "Caveat, cursive",
            Self::Kalam => "Kalam, cursive",
            Self::Patrick => "Patrick Hand, cursive",
            Self::Architect => "Architects Daughter, cursive",
            Self::Mono => "JetBrains Mono, Fira Code, monospace",
            Self::Hind => "Hind Siliguri, sans-serif",
            Self::Anek => "Anek Bangla, sans-serif",
            Self::NotoBengali => "Noto Serif Bengali, serif",
        }
    }

    pub fn from_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "caveat" => Self::Caveat,
            "kalam" => Self::Kalam,
            "patrick" => Self::Patrick,
            "architect" => Self::Architect,
            "mono" => Self::Mono,
            "hind" => Self::Hind,
            "anek" => Self::Anek,
            "noto-bengali" | "notobengali" => Self::NotoBengali,
            _ => Self::Sans,
        }
    }
}

/// Standardized Font Sizes in points / logical pixels
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FontSize;

impl FontSize {
    pub const TWO_XS: f32 = 10.0;
    pub const XS: f32 = 11.0;
    pub const SM: f32 = 12.0;
    pub const BASE: f32 = 13.0;
    pub const MD: f32 = 14.0;
    pub const LG: f32 = 16.0;
    pub const XL: f32 = 18.0;
    pub const TWO_XL: f32 = 20.0;
    pub const TITLE: f32 = 24.0;
}

/// Font Weights
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum FontWeight {
    Light = 300,
    #[default]
    Normal = 400,
    Medium = 500,
    SemiBold = 600,
    Bold = 700,
}

/// Line Height Multipliers
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LineHeight;

impl LineHeight {
    pub const NONE: f32 = 1.0;
    pub const TIGHT: f32 = 1.25;
    pub const NORMAL: f32 = 1.45;
    pub const RELAXED: f32 = 1.65;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hand_font_name() {
        assert_eq!(HandFont::Sans.name(), "Google Sans Flex (Default)");
        assert_eq!(HandFont::from_name("kalam"), HandFont::Kalam);
        assert_eq!(HandFont::from_name("noto-bengali"), HandFont::NotoBengali);
    }
}
