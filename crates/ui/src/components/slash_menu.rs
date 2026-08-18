//! Slash command (`/`) autocompletion popup menu.
//!
//! Monochromatic popup menu with keyboard navigation, 4px corner radius,
//! subtle shadow, and markdown insertion snippets.

use crate::tokens::{
    colors::*,
    icons::IconKind,
    radius::{CornerRadii, CORNER_RADIUS_SM},
    shadows::ShadowStyle,
    surfaces::SurfaceTheme,
};
use serde::{Deserialize, Serialize};

/// Slash Command Item Definition
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SlashCommandItem {
    pub id: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub icon: IconKind,
    pub snippet: &'static str,
}

pub const SLASH_COMMANDS: &[SlashCommandItem] = &[
    SlashCommandItem {
        id: "h1",
        title: "Heading 1",
        description: "Large section heading",
        icon: IconKind::Edit,
        snippet: "# ",
    },
    SlashCommandItem {
        id: "h2",
        title: "Heading 2",
        description: "Medium section heading",
        icon: IconKind::Edit,
        snippet: "## ",
    },
    SlashCommandItem {
        id: "h3",
        title: "Heading 3",
        description: "Small section heading",
        icon: IconKind::Edit,
        snippet: "### ",
    },
    SlashCommandItem {
        id: "todo",
        title: "Checklist Item",
        description: "Interactive todo checkbox",
        icon: IconKind::Check,
        snippet: "- [ ] ",
    },
    SlashCommandItem {
        id: "bullet",
        title: "Bullet List",
        description: "Unordered bullet point",
        icon: IconKind::MoreHorizontal,
        snippet: "- ",
    },
    SlashCommandItem {
        id: "code",
        title: "Code Block",
        description: "Syntax-highlighted code block",
        icon: IconKind::Keyboard,
        snippet: "```\n\n```",
    },
    SlashCommandItem {
        id: "quote",
        title: "Quote Block",
        description: "Capture inspirational quote",
        icon: IconKind::InformationCircle,
        snippet: "> ",
    },
    SlashCommandItem {
        id: "divider",
        title: "Horizontal Divider",
        description: "Visual separation line",
        icon: IconKind::MoreHorizontal,
        snippet: "---\n",
    },
];

/// Computed SlashMenu Visual Style
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SlashMenuStyle {
    pub bg: Rgba,
    pub border: Rgba,
    pub active_bg: Rgba,
    pub active_fg: Rgba,
    pub inactive_fg: Rgba,
    pub description_fg: Rgba,
    pub corner_radius: CornerRadii,
    pub shadow: ShadowStyle,
    pub width: f32,
    pub item_height: f32,
}

/// Declarative SlashMenu Component Model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SlashMenu {
    pub query: String,
    pub selected_index: usize,
    pub position_x: f32,
    pub position_y: f32,
}

impl SlashMenu {
    pub fn new(position_x: f32, position_y: f32) -> Self {
        Self {
            query: String::new(),
            selected_index: 0,
            position_x,
            position_y,
        }
    }

    pub fn with_query(mut self, query: impl Into<String>) -> Self {
        self.query = query.into();
        self
    }

    /// Filter commands by query string
    pub fn filtered_commands(&self) -> Vec<&'static SlashCommandItem> {
        let q = self.query.to_lowercase();
        SLASH_COMMANDS
            .iter()
            .filter(|cmd| {
                cmd.title.to_lowercase().contains(&q)
                    || cmd.description.to_lowercase().contains(&q)
                    || cmd.id.contains(&q)
            })
            .collect()
    }

    pub fn compute_style(&self, theme: &SurfaceTheme) -> SlashMenuStyle {
        let corner_radius = CornerRadii::uniform(CORNER_RADIUS_SM);

        let (bg, border, active_bg, active_fg, inactive_fg, description_fg) = if theme.is_dark {
            (SLATE_900, SLATE_800, SLATE_800, WHITE, SLATE_300, SLATE_500)
        } else {
            (WHITE, SLATE_200, SLATE_100, SLATE_900, SLATE_700, SLATE_400)
        };

        SlashMenuStyle {
            bg,
            border,
            active_bg,
            active_fg,
            inactive_fg,
            description_fg,
            corner_radius,
            shadow: ShadowStyle::md(),
            width: 260.0,
            item_height: 36.0,
        }
    }
}

use gpui::prelude::*;

impl gpui::IntoElement for SlashMenu {
    type Element = gpui::Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let style = self.compute_style(&theme);
        let w = gpui::px(style.width);
        let commands = self.filtered_commands();

        let mut menu_el = gpui::div()
            .flex()
            .flex_col()
            .w(w)
            .p(gpui::px(4.0))
            .rounded(gpui::px(CORNER_RADIUS_SM))
            .bg(gpui::Hsla::from(style.bg))
            .border_1()
            .border_color(gpui::Hsla::from(style.border));

        for (idx, cmd) in commands.into_iter().enumerate() {
            let is_selected = idx == self.selected_index;
            let (bg, fg) = if is_selected {
                (style.active_bg, style.active_fg)
            } else {
                (TRANSPARENT, style.inactive_fg)
            };

            let row = gpui::div()
                .flex()
                .items_center()
                .gap_2()
                .px(gpui::px(8.0))
                .py(gpui::px(6.0))
                .rounded(gpui::px(CORNER_RADIUS_SM))
                .bg(gpui::Hsla::from(bg))
                .text_color(gpui::Hsla::from(fg))
                .cursor_pointer()
                .child(cmd.icon.name())
                .child(
                    gpui::div().flex().flex_col().child(cmd.title).child(
                        gpui::div()
                            .text_color(gpui::Hsla::from(style.description_fg))
                            .child(cmd.description),
                    ),
                );

            menu_el = menu_el.child(row);
        }

        menu_el
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slash_menu_filtering() {
        let menu = SlashMenu::new(100.0, 200.0).with_query("todo");
        let results = menu.filtered_commands();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "todo");

        let dark = SurfaceTheme::dark();
        let style = menu.compute_style(&dark);
        assert_eq!(style.corner_radius.top_left, 4.0);
    }
}
