//! Color system, monochromatic palettes, and RGBA color utilities.
//!
//! Conforms strictly to DiaryNote's monochromatic slate aesthetic,
//! supporting light/dark theme adaptation and accent/status tokens.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Floating-point RGBA color with alpha in [0.0, 1.0]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rgba {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}

impl Rgba {
    pub const fn new(r: f32, g: f32, b: f32, a: f32) -> Self {
        Self { r, g, b, a }
    }

    pub const fn rgb(r: f32, g: f32, b: f32) -> Self {
        Self { r, g, b, a: 1.0 }
    }

    pub fn from_u8(r: u8, g: u8, b: u8, a: u8) -> Self {
        Self {
            r: r as f32 / 255.0,
            g: g as f32 / 255.0,
            b: b as f32 / 255.0,
            a: a as f32 / 255.0,
        }
    }

    pub fn from_rgb_u8(r: u8, g: u8, b: u8) -> Self {
        Self::from_u8(r, g, b, 255)
    }

    /// Parse hex color like "#ffffff", "#0f172a", "#2dd4bf80"
    pub fn hex(hex_str: &str) -> Self {
        let clean = hex_str.trim().trim_start_matches('#');
        match clean.len() {
            3 => {
                let r = u8::from_str_radix(&clean[0..1].repeat(2), 16).unwrap_or(0);
                let g = u8::from_str_radix(&clean[1..2].repeat(2), 16).unwrap_or(0);
                let b = u8::from_str_radix(&clean[2..3].repeat(2), 16).unwrap_or(0);
                Self::from_rgb_u8(r, g, b)
            }
            6 => {
                let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(0);
                let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(0);
                let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(0);
                Self::from_rgb_u8(r, g, b)
            }
            8 => {
                let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(0);
                let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(0);
                let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(0);
                let a = u8::from_str_radix(&clean[6..8], 16).unwrap_or(255);
                Self::from_u8(r, g, b, a)
            }
            _ => Self::from_rgb_u8(0, 0, 0),
        }
    }

    /// Return a copy with modified alpha channel
    pub fn with_alpha(&self, alpha: f32) -> Self {
        Self {
            r: self.r,
            g: self.g,
            b: self.b,
            a: alpha.clamp(0.0, 1.0),
        }
    }

    /// Blend linearly towards another color
    pub fn blend(&self, other: &Rgba, factor: f32) -> Self {
        let t = factor.clamp(0.0, 1.0);
        Self {
            r: self.r + (other.r - self.r) * t,
            g: self.g + (other.g - self.g) * t,
            b: self.b + (other.b - self.b) * t,
            a: self.a + (other.a - self.a) * t,
        }
    }

    /// Convert to hex string (#RRGGBB or #RRGGBBAA)
    pub fn to_hex(&self) -> String {
        let r = (self.r * 255.0).round() as u8;
        let g = (self.g * 255.0).round() as u8;
        let b = (self.b * 255.0).round() as u8;
        let a = (self.a * 255.0).round() as u8;
        if a == 255 {
            format!("#{r:02x}{g:02x}{b:02x}")
        } else {
            format!("#{r:02x}{g:02x}{b:02x}{a:02x}")
        }
    }
}

impl fmt::Display for Rgba {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_hex())
    }
}

// Monochromatic Slate Palette Constants
pub const WHITE: Rgba = Rgba::new(1.0, 1.0, 1.0, 1.0);
pub const BLACK: Rgba = Rgba::new(0.0, 0.0, 0.0, 1.0);
pub const TRANSPARENT: Rgba = Rgba::new(0.0, 0.0, 0.0, 0.0);

pub const SLATE_50: Rgba = Rgba::new(0.972, 0.980, 0.988, 1.0); // #f8fafc
pub const SLATE_100: Rgba = Rgba::new(0.945, 0.961, 0.976, 1.0); // #f1f5f9
pub const SLATE_200: Rgba = Rgba::new(0.886, 0.914, 0.941, 1.0); // #e2e8f0
pub const SLATE_300: Rgba = Rgba::new(0.796, 0.835, 0.882, 1.0); // #cbd5e1
pub const SLATE_400: Rgba = Rgba::new(0.580, 0.639, 0.722, 1.0); // #94a3b8
pub const SLATE_500: Rgba = Rgba::new(0.392, 0.455, 0.545, 1.0); // #64748b
pub const SLATE_600: Rgba = Rgba::new(0.278, 0.333, 0.416, 1.0); // #475569
pub const SLATE_700: Rgba = Rgba::new(0.200, 0.255, 0.333, 1.0); // #334155
pub const SLATE_800: Rgba = Rgba::new(0.118, 0.161, 0.231, 1.0); // #1e293b
pub const SLATE_850: Rgba = Rgba::new(0.086, 0.122, 0.180, 1.0); // #161f2e
pub const SLATE_900: Rgba = Rgba::new(0.059, 0.090, 0.165, 1.0); // #0f172a
pub const SLATE_950: Rgba = Rgba::new(0.008, 0.024, 0.075, 1.0); // #020617

pub const ROSE_50: Rgba = Rgba::new(1.0, 0.945, 0.949, 1.0);
pub const ROSE_400: Rgba = Rgba::new(0.984, 0.443, 0.522, 1.0);
pub const ROSE_500: Rgba = Rgba::new(0.957, 0.267, 0.365, 1.0);
pub const ROSE_600: Rgba = Rgba::new(0.882, 0.114, 0.278, 1.0);
pub const ROSE_950: Rgba = Rgba::new(0.298, 0.024, 0.078, 1.0);

pub const EMERALD_50: Rgba = Rgba::new(0.925, 0.992, 0.949, 1.0);
pub const EMERALD_400: Rgba = Rgba::new(0.204, 0.827, 0.600, 1.0);
pub const EMERALD_500: Rgba = Rgba::new(0.063, 0.725, 0.506, 1.0);
pub const EMERALD_600: Rgba = Rgba::new(0.020, 0.588, 0.412, 1.0);
pub const EMERALD_950: Rgba = Rgba::new(0.008, 0.208, 0.137, 1.0);

pub const AMBER_50: Rgba = Rgba::new(1.0, 0.984, 0.929, 1.0);
pub const AMBER_400: Rgba = Rgba::new(0.984, 0.749, 0.141, 1.0);
pub const AMBER_500: Rgba = Rgba::new(0.961, 0.620, 0.043, 1.0);
pub const AMBER_600: Rgba = Rgba::new(0.851, 0.467, 0.024, 1.0);
pub const AMBER_950: Rgba = Rgba::new(0.271, 0.114, 0.016, 1.0);

pub const SKY_50: Rgba = Rgba::new(0.941, 0.976, 1.0, 1.0);
pub const SKY_400: Rgba = Rgba::new(0.220, 0.741, 0.973, 1.0);
pub const SKY_500: Rgba = Rgba::new(0.055, 0.647, 0.914, 1.0);
pub const SKY_600: Rgba = Rgba::new(0.012, 0.518, 0.780, 1.0);
pub const SKY_950: Rgba = Rgba::new(0.031, 0.176, 0.278, 1.0);

pub const BLUE_400: Rgba = Rgba::new(0.380, 0.655, 0.984, 1.0);
pub const BLUE_500: Rgba = Rgba::new(0.231, 0.510, 0.965, 1.0);
pub const BLUE_600: Rgba = Rgba::new(0.145, 0.388, 0.922, 1.0);
pub const VIOLET_500: Rgba = Rgba::new(0.549, 0.337, 0.965, 1.0);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_parsing() {
        let white = Rgba::hex("#ffffff");
        assert_eq!(white, WHITE);

        let black = Rgba::hex("#000000");
        assert_eq!(black, BLACK);

        let slate_900 = Rgba::hex("#0f172a");
        assert!((slate_900.r - 0.059).abs() < 0.01);
        assert!((slate_900.g - 0.090).abs() < 0.01);
        assert!((slate_900.b - 0.165).abs() < 0.01);

        let with_alpha = Rgba::hex("#0f172a80");
        assert!((with_alpha.a - 0.5).abs() < 0.02);
    }

    #[test]
    fn test_color_blend_and_alpha() {
        let c1 = Rgba::new(1.0, 0.0, 0.0, 1.0);
        let c2 = Rgba::new(0.0, 1.0, 0.0, 1.0);
        let mid = c1.blend(&c2, 0.5);
        assert_eq!(mid.r, 0.5);
        assert_eq!(mid.g, 0.5);
        assert_eq!(mid.b, 0.0);

        let transparent_slate = SLATE_900.with_alpha(0.4);
        assert_eq!(transparent_slate.a, 0.4);
    }
}
