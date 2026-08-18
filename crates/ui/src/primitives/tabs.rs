//! Tabs primitive component.
//!
//! Monochromatic tab list with active pill trigger, 4px corner radius,
//! subtle shadow on active state, and content panel switcher.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Tab Item Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TabItem {
    pub id: String,
    pub label: String,
    pub icon: Option<IconKind>,
    pub disabled: bool,
}

impl TabItem {
    pub fn new(id: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            icon: None,
            disabled: false,
        }
    }

    pub fn with_icon(mut self, icon: IconKind) -> Self {
        self.icon = Some(icon);
        self
    }

    pub fn with_disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }
}

/// Computed Tabs Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TabsStyle {
    pub list_bg: Rgba,
    pub list_border: Rgba,
    pub active_bg: Rgba,
    pub active_fg: Rgba,
    pub inactive_fg: Rgba,
    pub inactive_fg_hover: Rgba,
    pub inactive_bg_hover: Rgba,
    pub corner_radius: CornerRadii,
    pub active_shadow: ShadowStyle,
    pub height: f32,
    pub font_size: f32,
}

/// Declarative Tabs Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Tabs {
    pub active_tab: String,
    pub tabs: Vec<TabItem>,
}

impl Tabs {
    pub fn new(active_tab: impl Into<String>) -> Self {
        Self {
            active_tab: active_tab.into(),
            tabs: Vec::new(),
        }
    }

    pub fn with_tab(mut self, tab: TabItem) -> Self {
        self.tabs.push(tab);
        self
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> TabsStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (
            list_bg,
            list_border,
            active_bg,
            active_fg,
            inactive_fg,
            inactive_fg_hover,
            inactive_bg_hover,
        ) = if theme.is_dark {
            (
                SLATE_800.with_alpha(0.8),
                SLATE_700.with_alpha(0.6),
                SLATE_900,
                SLATE_100,
                SLATE_400,
                SLATE_100,
                SLATE_700.with_alpha(0.5),
            )
        } else {
            (
                SLATE_100,
                SLATE_200,
                WHITE,
                SLATE_900,
                SLATE_600,
                SLATE_900,
                SLATE_200.with_alpha(0.5),
            )
        };

        TabsStyle {
            list_bg,
            list_border,
            active_bg,
            active_fg,
            inactive_fg,
            inactive_fg_hover,
            inactive_bg_hover,
            corner_radius,
            active_shadow: ShadowStyle::xs(),
            height: 32.0,
            font_size: 12.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for Tabs {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);

        let mut list = gpui::div()
            .flex()
            .items_center()
            .p(gpui::px(2.0))
            .gap_1()
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.list_bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.list_border));

        for tab in self.tabs {
            let is_active = tab.id == self.active_tab;
            let (bg, fg) = if is_active {
                (style.active_bg, style.active_fg)
            } else {
                (TRANSPARENT, style.inactive_fg)
            };

            let mut tab_btn = gpui::div()
                .flex()
                .items_center()
                .gap_1()
                .px(gpui::px(8.0))
                .py(gpui::px(4.0))
                .rounded(gpui::px(CORNER_RADIUS_SM))
                .bg(gpui::Hsla::from(bg))
                .text_color(gpui::Hsla::from(fg))
                .cursor_pointer();

            if !is_active {
                tab_btn = tab_btn.hover(|s| {
                    s.bg(gpui::Hsla::from(style.inactive_bg_hover))
                        .text_color(gpui::Hsla::from(style.inactive_fg_hover))
                });
            }

            if let Some(icon) = tab.icon {
                tab_btn = tab_btn.child(icon.name());
            }
            tab_btn = tab_btn.child(tab.label);

            list = list.child(tab_btn);
        }

        list
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tabs_builder() {
        let tabs = Tabs::new("canvas")
            .with_tab(TabItem::new("canvas", "Canvas").with_icon(IconKind::Grid))
            .with_tab(TabItem::new("ai", "AI Services").with_icon(IconKind::Sparkles));

        assert_eq!(tabs.active_tab, "canvas");
        assert_eq!(tabs.tabs.len(), 2);

        let dark = SurfaceTheme::dark();
        let style = tabs.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
        assert_eq!(style.active_bg, SLATE_900);
    }
}
