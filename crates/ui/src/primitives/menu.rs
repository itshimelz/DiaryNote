//! Menu & context menu popover primitives.
//!
//! Monochromatic dropdown and context menu with 4px corner radius,
//! keyboard navigation highlights, shortcuts, danger actions, and section headers.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Computed Menu Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MenuStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub divider: Rgba,
    pub header_fg: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub min_width: f32,
    pub padding: f32,
}

/// Computed MenuItem Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MenuItemStyle {
    pub bg: Rgba,
    pub bg_hover: Rgba,
    pub fg: Rgba,
    pub fg_hover: Rgba,
    pub icon_color: Rgba,
    pub corner_radius: CornerRadii,
    pub height: f32,
    pub font_size: f32,
    pub padding_x: f32,
    pub opacity: f32,
}

/// Menu Item Entry Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MenuItem {
    pub id: String,
    pub label: String,
    pub icon: Option<IconKind>,
    pub shortcut: Option<String>,
    pub danger: bool,
    pub active: bool,
    pub disabled: bool,
    pub theme: Option<SurfaceTheme>,
}

impl MenuItem {
    pub fn new(id: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            icon: None,
            shortcut: None,
            danger: false,
            active: false,
            disabled: false,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn with_icon(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self
    }

    pub fn with_shortcut(mut self, shortcut: impl Into<String>) -> Self {
        self.shortcut = Some(shortcut.into());
        self
    }

    pub fn with_danger(mut self, danger: bool) -> Self {
        self.danger = danger;
        self
    }

    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> MenuItemStyle {
        let opacity = if self.disabled { 0.4 } else { 1.0 };
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, bg_hover, fg, fg_hover, icon_color) = if self.danger {
            if theme.is_dark {
                (
                    TRANSPARENT,
                    ROSE_950.with_alpha(0.4),
                    ROSE_400,
                    ROSE_400,
                    ROSE_500,
                )
            } else {
                (TRANSPARENT, ROSE_50, ROSE_600, ROSE_600, ROSE_500)
            }
        } else if self.active {
            if theme.is_dark {
                (SLATE_800, SLATE_700, SLATE_100, WHITE, SLATE_200)
            } else {
                (SLATE_900, SLATE_800, WHITE, WHITE, WHITE)
            }
        } else if theme.is_dark {
            (TRANSPARENT, SLATE_800, SLATE_300, SLATE_100, SLATE_400)
        } else {
            (TRANSPARENT, SLATE_100, SLATE_700, SLATE_900, SLATE_500)
        };

        MenuItemStyle {
            bg,
            bg_hover,
            fg,
            fg_hover,
            icon_color,
            corner_radius,
            height: 28.0,
            font_size: 12.0,
            padding_x: 10.0,
            opacity,
        }
    }
}

/// Declarative Menu Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Menu {
    pub items: Vec<MenuItem>,
    pub min_width: f32,
    pub theme: Option<SurfaceTheme>,
}

impl Menu {
    pub fn new() -> Self {
        Self {
            items: Vec::new(),
            min_width: 180.0,
            theme: None,
        }
    }

    pub fn with_theme(mut self, theme: SurfaceTheme) -> Self {
        self.theme = Some(theme);
        self
    }

    pub fn with_item(mut self, item: MenuItem) -> Self {
        self.items.push(item);
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> MenuStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, border, divider, header_fg) = if theme.is_dark {
            (SLATE_900, SLATE_800, SLATE_800, SLATE_500)
        } else {
            (WHITE, SLATE_200, SLATE_200, SLATE_400)
        };

        MenuStyle {
            bg,
            border,
            divider,
            header_fg,
            corner_radius,
            shadow: ShadowStyle::md(),
            min_width: self.min_width,
            padding: 4.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for MenuItem {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);

        let mut row = gpui::div()
            .flex()
            .items_center()
            .justify_between()
            .h(gpui::px(style.height))
            .px(gpui::px(style.padding_x))
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .text_color(gpui::Hsla::from(style.fg))
            .hover(|s| {
                s.bg(gpui::Hsla::from(style.bg_hover))
                    .text_color(gpui::Hsla::from(style.fg_hover))
            })
            .cursor_pointer();

        let mut left = gpui::div().flex().items_center().gap_2();
        if let Some(icon) = self.icon {
            left = left.child(
                gpui::div()
                    .text_color(gpui::Hsla::from(style.icon_color))
                    .child(icon.name()),
            );
        }
        left = left.child(self.label);
        row = row.child(left);

        if let Some(shortcut) = self.shortcut {
            row = row.child(
                gpui::div()
                    .text_color(gpui::Hsla::from(SLATE_500))
                    .child(shortcut),
            );
        }

        row
    }
}

impl gpui::IntoElement for Menu {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = self.theme.as_ref().cloned().unwrap_or_default();
        let style = self.compute_style(&theme);
        let min_w = gpui::px(style.min_width);
        let pad = gpui::px(style.padding);

        let mut menu_el = gpui::div()
            .flex()
            .flex_col()
            .min_w(min_w)
            .p(pad)
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border));

        for item in self.items {
            menu_el = menu_el.child(item);
        }

        menu_el
    }
}

impl Default for Menu {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_menu_builder() {
        let menu = Menu::new()
            .with_item(MenuItem::new("edit", "Edit Note").with_icon(IconKind::Edit))
            .with_item(MenuItem::new("delete", "Delete Note").with_danger(true));

        assert_eq!(menu.items.len(), 2);
        assert!(menu.items[1].danger);

        let dark = SurfaceTheme::dark();
        let style = menu.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
