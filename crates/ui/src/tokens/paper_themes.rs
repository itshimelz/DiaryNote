//! Note card paper themes with distinct backgrounds, borders, headers, and text colors.
//!
//! Directly matches the 9 paper themes configured in DiaryNote.

use super::colors::{
    Rgba, BLUE_400, BLUE_600, SLATE_100, SLATE_200, SLATE_300, SLATE_400, SLATE_50, SLATE_500,
    SLATE_600, SLATE_700, SLATE_800, SLATE_900, SLATE_950, WHITE,
};
use serde::{Deserialize, Serialize};

/// Supported Paper Theme Kind
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum PaperThemeKind {
    #[default]
    White,
    Cream,
    Ruled,
    Dotted,
    #[serde(rename = "ruled-dark")]
    RuledDark,
    Kraft,
    Dark,
    Graphite,
    Transparent,
}

impl PaperThemeKind {
    pub const ALL: [Self; 9] = [
        Self::White,
        Self::Cream,
        Self::Ruled,
        Self::Dotted,
        Self::Kraft,
        Self::Dark,
        Self::RuledDark,
        Self::Graphite,
        Self::Transparent,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::White => "white",
            Self::Cream => "cream",
            Self::Ruled => "ruled",
            Self::Dotted => "dotted",
            Self::RuledDark => "ruled-dark",
            Self::Kraft => "kraft",
            Self::Dark => "dark",
            Self::Graphite => "graphite",
            Self::Transparent => "transparent",
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Self::White => "White",
            Self::Cream => "Cream",
            Self::Ruled => "Ruled",
            Self::Dotted => "Dotted",
            Self::RuledDark => "Ruled Dark",
            Self::Kraft => "Kraft",
            Self::Dark => "Dark",
            Self::Graphite => "Graphite",
            Self::Transparent => "Transparent",
        }
    }

    pub fn from_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "cream" => Self::Cream,
            "ruled" => Self::Ruled,
            "dotted" => Self::Dotted,
            "ruled-dark" | "ruled_dark" => Self::RuledDark,
            "kraft" => Self::Kraft,
            "dark" => Self::Dark,
            "graphite" => Self::Graphite,
            "transparent" | "glass" => Self::Transparent,
            _ => Self::White,
        }
    }

    pub fn config(&self) -> PaperThemeConfig {
        match self {
            Self::White => PaperThemeConfig {
                kind: *self,
                bg: WHITE,
                text: SLATE_900,
                subtext: SLATE_400,
                border: SLATE_200.with_alpha(0.9),
                header_bg: WHITE,
                toolbar_bg: WHITE,
                divider: SLATE_100,
                toolbar_btn: SLATE_700,
                toolbar_btn_hover: SLATE_900,
                toolbar_btn_hover_bg: SLATE_100,
                input_bg: Rgba::hex("#f8fafc"),
                input_border: SLATE_200,
                checkbox_unchecked: SLATE_400,
                checkbox_checked_bg: SLATE_900,
                checkbox_checked_fg: WHITE,
                hover_bg: SLATE_100.with_alpha(0.7),
                link_color: BLUE_600,
                is_dark: false,
            },
            Self::Cream => PaperThemeConfig {
                kind: *self,
                bg: Rgba::hex("#faf8f5"),
                text: Rgba::hex("#1e293b"),
                subtext: SLATE_400,
                border: Rgba::hex("#fde68a").with_alpha(0.6),
                header_bg: Rgba::hex("#faf8f5"),
                toolbar_bg: Rgba::hex("#faf8f5"),
                divider: Rgba::hex("#fde68a").with_alpha(0.4),
                toolbar_btn: SLATE_700,
                toolbar_btn_hover: SLATE_900,
                toolbar_btn_hover_bg: Rgba::hex("#fef3c7").with_alpha(0.6),
                input_bg: Rgba::hex("#fffbeb").with_alpha(0.6),
                input_border: Rgba::hex("#fde68a"),
                checkbox_unchecked: Rgba::hex("#fbbf24"),
                checkbox_checked_bg: Rgba::hex("#92400e"),
                checkbox_checked_fg: Rgba::hex("#fffbeb"),
                hover_bg: Rgba::hex("#fef3c7").with_alpha(0.4),
                link_color: Rgba::hex("#92400e"),
                is_dark: false,
            },
            Self::Ruled => PaperThemeConfig {
                kind: *self,
                bg: Rgba::hex("#fffdf9"),
                text: Rgba::hex("#1c1917"),
                subtext: Rgba::hex("#a8a29e"),
                border: Rgba::hex("#d6d3d1").with_alpha(0.8),
                header_bg: Rgba::hex("#f8f3e8"),
                toolbar_bg: Rgba::hex("#f8f3e8"),
                divider: Rgba::hex("#e7e5e4").with_alpha(0.8),
                toolbar_btn: Rgba::hex("#44403c"),
                toolbar_btn_hover: Rgba::hex("#1c1917"),
                toolbar_btn_hover_bg: Rgba::hex("#f5f5f4"),
                input_bg: Rgba::hex("#f0e8d8"),
                input_border: Rgba::hex("#d6d3d1"),
                checkbox_unchecked: Rgba::hex("#a8a29e"),
                checkbox_checked_bg: Rgba::hex("#292524"),
                checkbox_checked_fg: Rgba::hex("#f5f5f4"),
                hover_bg: Rgba::hex("#e7e5e4").with_alpha(0.4),
                link_color: Rgba::hex("#92400e"),
                is_dark: false,
            },
            Self::Dotted => PaperThemeConfig {
                kind: *self,
                bg: Rgba::hex("#fffdf9"),
                text: SLATE_900,
                subtext: SLATE_400,
                border: SLATE_300.with_alpha(0.8),
                header_bg: Rgba::hex("#fffdf9"),
                toolbar_bg: Rgba::hex("#fffdf9"),
                divider: SLATE_200.with_alpha(0.8),
                toolbar_btn: SLATE_700,
                toolbar_btn_hover: SLATE_900,
                toolbar_btn_hover_bg: SLATE_100,
                input_bg: SLATE_100.with_alpha(0.8),
                input_border: SLATE_200,
                checkbox_unchecked: SLATE_400,
                checkbox_checked_bg: SLATE_900,
                checkbox_checked_fg: WHITE,
                hover_bg: SLATE_100.with_alpha(0.7),
                link_color: BLUE_600,
                is_dark: false,
            },
            Self::RuledDark => PaperThemeConfig {
                kind: *self,
                bg: Rgba::hex("#0b1329"),
                text: SLATE_200,
                subtext: SLATE_500,
                border: SLATE_700.with_alpha(0.8),
                header_bg: Rgba::hex("#0f1729"),
                toolbar_bg: Rgba::hex("#0f1729"),
                divider: SLATE_700.with_alpha(0.6),
                toolbar_btn: SLATE_400,
                toolbar_btn_hover: WHITE,
                toolbar_btn_hover_bg: SLATE_800,
                input_bg: SLATE_800.with_alpha(0.8),
                input_border: SLATE_700,
                checkbox_unchecked: SLATE_600,
                checkbox_checked_bg: BLUE_600,
                checkbox_checked_fg: WHITE,
                hover_bg: SLATE_800.with_alpha(0.6),
                link_color: BLUE_400,
                is_dark: true,
            },
            Self::Kraft => PaperThemeConfig {
                kind: *self,
                bg: Rgba::hex("#f6ebd9"),
                text: Rgba::hex("#3d2b1f"),
                subtext: Rgba::hex("#8c7462"),
                border: Rgba::hex("#e4d4ba"),
                header_bg: Rgba::hex("#ebdcb3"),
                toolbar_bg: Rgba::hex("#ebdcb3"),
                divider: Rgba::hex("#dcc8a3"),
                toolbar_btn: Rgba::hex("#523d2e"),
                toolbar_btn_hover: Rgba::hex("#21150c"),
                toolbar_btn_hover_bg: Rgba::hex("#dfceaa"),
                input_bg: Rgba::hex("#ebdcb3").with_alpha(0.6),
                input_border: Rgba::hex("#dcc8a3"),
                checkbox_unchecked: Rgba::hex("#8c7462"),
                checkbox_checked_bg: Rgba::hex("#523d2e"),
                checkbox_checked_fg: Rgba::hex("#f6ebd9"),
                hover_bg: Rgba::hex("#dfceaa").with_alpha(0.4),
                link_color: Rgba::hex("#8b4513"),
                is_dark: false,
            },
            Self::Dark => PaperThemeConfig {
                kind: *self,
                bg: SLATE_900,
                text: SLATE_100,
                subtext: SLATE_400,
                border: SLATE_800,
                header_bg: SLATE_900,
                toolbar_bg: SLATE_900,
                divider: SLATE_800,
                toolbar_btn: SLATE_300,
                toolbar_btn_hover: WHITE,
                toolbar_btn_hover_bg: SLATE_800,
                input_bg: SLATE_800.with_alpha(0.9),
                input_border: SLATE_700,
                checkbox_unchecked: SLATE_600,
                checkbox_checked_bg: BLUE_600,
                checkbox_checked_fg: WHITE,
                hover_bg: SLATE_800.with_alpha(0.6),
                link_color: BLUE_400,
                is_dark: true,
            },
            Self::Graphite => PaperThemeConfig {
                kind: *self,
                bg: SLATE_950,
                text: SLATE_200,
                subtext: SLATE_500,
                border: SLATE_800,
                header_bg: SLATE_950,
                toolbar_bg: SLATE_950,
                divider: SLATE_800,
                toolbar_btn: SLATE_400,
                toolbar_btn_hover: SLATE_100,
                toolbar_btn_hover_bg: SLATE_900,
                input_bg: SLATE_900,
                input_border: SLATE_800,
                checkbox_unchecked: SLATE_700,
                checkbox_checked_bg: BLUE_600,
                checkbox_checked_fg: WHITE,
                hover_bg: SLATE_900.with_alpha(0.8),
                link_color: BLUE_400,
                is_dark: true,
            },
            Self::Transparent => PaperThemeConfig {
                kind: *self,
                bg: WHITE.with_alpha(0.95),
                text: SLATE_900,
                subtext: SLATE_400,
                border: SLATE_200.with_alpha(0.8),
                header_bg: WHITE.with_alpha(0.95),
                toolbar_bg: WHITE.with_alpha(0.95),
                divider: SLATE_100,
                toolbar_btn: SLATE_700,
                toolbar_btn_hover: SLATE_900,
                toolbar_btn_hover_bg: SLATE_100.with_alpha(0.8),
                input_bg: SLATE_50.with_alpha(0.9),
                input_border: SLATE_200,
                checkbox_unchecked: SLATE_400,
                checkbox_checked_bg: SLATE_900,
                checkbox_checked_fg: WHITE,
                hover_bg: SLATE_100.with_alpha(0.6),
                link_color: BLUE_600,
                is_dark: false,
            },
        }
    }
}

/// Full Theme Configuration for a Note Paper
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PaperThemeConfig {
    pub kind: PaperThemeKind,
    pub bg: Rgba,
    pub text: Rgba,
    pub subtext: Rgba,
    pub border: Rgba,
    pub header_bg: Rgba,
    pub toolbar_bg: Rgba,
    pub divider: Rgba,
    pub toolbar_btn: Rgba,
    pub toolbar_btn_hover: Rgba,
    pub toolbar_btn_hover_bg: Rgba,
    pub input_bg: Rgba,
    pub input_border: Rgba,
    pub checkbox_unchecked: Rgba,
    pub checkbox_checked_bg: Rgba,
    pub checkbox_checked_fg: Rgba,
    pub hover_bg: Rgba,
    pub link_color: Rgba,
    pub is_dark: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_paper_themes() {
        for kind in PaperThemeKind::ALL {
            let config = kind.config();
            assert_eq!(config.kind, kind);
            assert!(config.bg.a > 0.0);
        }
    }

    #[test]
    fn test_theme_name_parsing() {
        assert_eq!(PaperThemeKind::from_name("cream"), PaperThemeKind::Cream);
        assert_eq!(
            PaperThemeKind::from_name("ruled-dark"),
            PaperThemeKind::RuledDark
        );
        assert_eq!(
            PaperThemeKind::from_name("glass"),
            PaperThemeKind::Transparent
        );
    }
}
