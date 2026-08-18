//! Note style and paper theme picker component.
//!
//! Monochromatic floating popup with 9 paper theme tiles and font family selector.

use crate::tokens::{
    colors::*,
    paper_themes::PaperThemeKind,
    radius::{CornerRadii, CORNER_RADIUS_SM, CORNER_RADIUS_XS},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
    typography::HandFont,
};
use serde::{Deserialize, Serialize};

/// Computed StylePicker Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StylePickerStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub text_color: Rgba,
    pub corner_radius: CornerRadii,
    pub tile_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub width: f32,
    pub padding: f32,
}

/// Declarative StylePicker Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StylePicker {
    pub selected_paper: PaperThemeKind,
    pub selected_font: HandFont,
}

impl StylePicker {
    pub fn new(selected_paper: PaperThemeKind, selected_font: HandFont) -> Self {
        Self {
            selected_paper,
            selected_font,
        }
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> StylePickerStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);
        let tile_radius = CornerRadii::uniform(CORNER_RADIUS_XS);

        let (bg, border, text_color) = if theme.is_dark {
            (SLATE_900, SLATE_800, SLATE_100)
        } else {
            (WHITE, SLATE_200, SLATE_900)
        };

        StylePickerStyle {
            bg,
            border,
            text_color,
            corner_radius,
            tile_radius,
            shadow: ShadowStyle::md(),
            width: 220.0,
            padding: 12.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_style_picker_builder() {
        let picker = StylePicker::new(PaperThemeKind::Cream, HandFont::Caveat);
        assert_eq!(picker.selected_paper, PaperThemeKind::Cream);
        assert_eq!(picker.selected_font, HandFont::Caveat);

        let dark = SurfaceTheme::dark();
        let style = picker.compute_style(&dark);
        assert_eq!(style.width, 220.0);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
