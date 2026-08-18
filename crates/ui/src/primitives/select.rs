//! Select (dropdown picker) primitive component.
//!
//! Monochromatic dropdown with options, label, error text, and 4px corner radius.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Select Option Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SelectOption {
    pub value: String,
    pub label: String,
    pub disabled: bool,
}

impl SelectOption {
    pub fn new(value: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            label: label.into(),
            disabled: false,
        }
    }
}

/// Computed Select Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SelectStyle {
    pub bg: Rgba,
    pub fg: Rgba,
    pub border: Rgba,
    pub border_hover: Rgba,
    pub chevron_color: Rgba,
    pub label_color: Rgba,
    pub corner_radius: CornerRadii,
    pub height: f32,
    pub font_size: f32,
    pub padding_x: f32,
    pub opacity: f32,
}

/// Declarative Select Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Select {
    pub selected_value: String,
    pub options: Vec<SelectOption>,
    pub label: Option<String>,
    pub error: Option<String>,
    pub helper_text: Option<String>,
    pub icon: Option<IconKind>,
    pub disabled: bool,
}

impl Select {
    pub fn new(selected_value: impl Into<String>) -> Self {
        Self {
            selected_value: selected_value.into(),
            options: Vec::new(),
            label: None,
            error: None,
            helper_text: None,
            icon: None,
            disabled: false,
        }
    }

    pub fn with_option(mut self, option: SelectOption) -> Self {
        self.options.push(option);
        self
    }

    pub fn with_label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    pub fn with_error(mut self, error: impl Into<String>) -> Self {
        self.error = Some(error.into());
        self
    }

    pub fn with_icon(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> SelectStyle {
        let opacity = if self.disabled { 0.5 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, fg, border, border_hover, chevron_color, label_color) = if self.error.is_some() {
            let bg = if theme.is_dark { SLATE_900 } else { WHITE };
            (bg, ROSE_500, ROSE_500, ROSE_500, ROSE_500, ROSE_500)
        } else if theme.is_dark {
            (
                SLATE_850, SLATE_200, SLATE_700, SLATE_600, SLATE_400, SLATE_300,
            )
        } else {
            (
                SLATE_50, SLATE_800, SLATE_200, SLATE_300, SLATE_500, SLATE_700,
            )
        };

        SelectStyle {
            bg,
            fg,
            border,
            border_hover,
            chevron_color,
            label_color,
            corner_radius,
            height: 32.0,
            font_size: 12.0,
            padding_x: 12.0,
            opacity,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_builder() {
        let select = Select::new("sans")
            .with_label("Typography")
            .with_option(SelectOption::new("sans", "Google Sans"))
            .with_option(SelectOption::new("mono", "Monospace"));

        assert_eq!(select.selected_value, "sans");
        assert_eq!(select.options.len(), 2);

        let dark = SurfaceTheme::dark();
        let style = select.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
