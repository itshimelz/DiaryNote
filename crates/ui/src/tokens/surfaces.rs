//! Surface themes, panel colors, borders, and theme resolution for Light/Dark modes.

use super::colors::*;
use serde::{Deserialize, Serialize};

/// Theme mode setting
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    #[default]
    System,
    Light,
    Dark,
}

/// Resolved Surface Palette
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SurfaceTheme {
    pub is_dark: bool,
    pub canvas: Rgba,
    pub panel: Rgba,
    pub sub_surface: Rgba,
    pub sub_surface_hover: Rgba,
    pub border: Rgba,
    pub border_subtle: Rgba,
    pub border_hover: Rgba,
    pub text: Rgba,
    pub text_muted: Rgba,
    pub text_dim: Rgba,
    pub focus_ring: Rgba,
    pub selection_overlay: Rgba,
}

impl SurfaceTheme {
    /// Strict monochromatic Dark theme palette
    pub fn dark() -> Self {
        Self {
            is_dark: true,
            canvas: SLATE_950,
            panel: SLATE_900,
            sub_surface: SLATE_800.with_alpha(0.8),
            sub_surface_hover: SLATE_800,
            border: SLATE_800,
            border_subtle: SLATE_800.with_alpha(0.8),
            border_hover: SLATE_700,
            text: SLATE_100,
            text_muted: SLATE_400,
            text_dim: SLATE_500,
            focus_ring: SLATE_500,
            selection_overlay: BLUE_500.with_alpha(0.15),
        }
    }

    /// Strict monochromatic Light theme palette
    pub fn light() -> Self {
        Self {
            is_dark: false,
            canvas: SLATE_100,
            panel: WHITE,
            sub_surface: SLATE_50,
            sub_surface_hover: SLATE_100,
            border: SLATE_200,
            border_subtle: SLATE_200.with_alpha(0.8),
            border_hover: SLATE_300,
            text: SLATE_900,
            text_muted: SLATE_600,
            text_dim: SLATE_400,
            focus_ring: SLATE_400,
            selection_overlay: BLUE_500.with_alpha(0.15),
        }
    }

    /// Resolve theme based on mode and OS dark mode status
    pub fn resolve(mode: ThemeMode, system_is_dark: bool) -> Self {
        match mode {
            ThemeMode::Light => Self::light(),
            ThemeMode::Dark => Self::dark(),
            ThemeMode::System => {
                if system_is_dark {
                    Self::dark()
                } else {
                    Self::light()
                }
            }
        }
    }
}

impl Default for SurfaceTheme {
    fn default() -> Self {
        Self::dark()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_theme_resolution() {
        let light = SurfaceTheme::resolve(ThemeMode::Light, true);
        assert!(!light.is_dark);
        assert_eq!(light.panel, WHITE);

        let dark = SurfaceTheme::resolve(ThemeMode::Dark, false);
        assert!(dark.is_dark);
        assert_eq!(dark.panel, SLATE_900);

        let sys_dark = SurfaceTheme::resolve(ThemeMode::System, true);
        assert!(sys_dark.is_dark);
    }
}
