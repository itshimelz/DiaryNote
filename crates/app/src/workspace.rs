//! Primary GPUI Workspace View.
//!
//! Orchestrates the Infinite Canvas, interactive note cards, floating bottom command dock,
//! status bar, collapsible sidebar drawer, and desktop modals.

use crate::state::AppState;
use gpui::*;
use ui::tokens::colors::*;
use ui::tokens::radius::CORNER_RADIUS_SM;

#[allow(dead_code)]
pub struct WorkspaceView {
    pub state: AppState,
}

#[allow(dead_code)]
impl WorkspaceView {
    pub fn new() -> Self {
        Self {
            state: AppState::new(),
        }
    }

    /// Zoom in by 10%
    pub fn zoom_in(&mut self) {
        let new_zoom = (self.state.camera.zoom * 1.1).min(3.0);
        self.state.camera.zoom = new_zoom;
    }

    /// Zoom out by 10%
    pub fn zoom_out(&mut self) {
        let new_zoom = (self.state.camera.zoom / 1.1).max(0.2);
        self.state.camera.zoom = new_zoom;
    }
}

impl Render for WorkspaceView {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let theme = &self.state.theme;
        let selected_count = self.state.selected_note_ids.len();

        // 1. Root Container (Window bounds)
        let mut root = div()
            .relative()
            .flex()
            .size_full()
            .bg(Hsla::from(if theme.is_dark {
                SLATE_950
            } else {
                SLATE_100
            }))
            .overflow_hidden();

        // 2. Sidebar Drawer (Left side)
        if self.state.is_sidebar_open {
            let mut sidebar_items = Vec::new();
            for note in &self.state.notes {
                let is_active = self.state.selected_note_ids.contains(&note.id);
                let snippet = if note.body.len() > 60 {
                    format!("{}...", &note.body[..60])
                } else {
                    note.body.clone()
                };

                sidebar_items.push(ui::views::sidebar_view::SidebarNoteItem {
                    id: note.id,
                    title: note.title.clone(),
                    snippet,
                    date_str: note.updated_at.format("%b %d").to_string(),
                    is_pinned: note.is_pinned,
                    is_locked: note.is_locked,
                    is_favorite: note.is_favorite,
                    is_active,
                });
            }

            let sidebar_view = ui::views::NotesSidebarView::new().with_items(sidebar_items);

            root = root.child(sidebar_view);
        }

        // 3. Infinite Canvas Viewport (Main central area)
        let mut canvas_container = div().relative().flex_1().h_full().overflow_hidden();

        // Render Note Cards on Canvas using camera projection
        for note in &self.state.notes {
            let is_selected = self.state.selected_note_ids.contains(&note.id);
            let is_editing = self.state.editing_note_id == Some(note.id);
            let screen_pos = self.state.camera.canvas_to_screen(note.position);

            let note_card_view = ui::views::NoteCardView::from_note(note, is_selected, is_editing);

            let card_wrapper = div()
                .absolute()
                .left(px(screen_pos.x))
                .top(px(screen_pos.y))
                .cursor_pointer()
                .child(note_card_view);

            canvas_container = canvas_container.child(card_wrapper);
        }

        // Render 2D Minimap in top-right corner
        let minimap = ui::components::Minimap::new();
        let minimap_wrapper = div().absolute().top_4().right_4().child(minimap);
        canvas_container = canvas_container.child(minimap_wrapper);

        // 4. Floating Command Dock & Status Bar (Bottom Center)
        let mut bottom_dock = div()
            .absolute()
            .bottom_4()
            .left_0()
            .right_0()
            .flex()
            .flex_col()
            .items_center()
            .gap_2();

        // Batch Action Bar (if 2+ notes are selected)
        if selected_count >= 2 {
            let batch_bar = ui::components::BatchActionBar::new(selected_count);
            bottom_dock = bottom_dock.child(batch_bar);
        }

        // Main Dock Control Bar
        let zoom_pct = (self.state.camera.zoom * 100.0).round() as usize;
        let mut dock_controls = div()
            .flex()
            .items_center()
            .gap_1()
            .px(px(8.0))
            .py(px(6.0))
            .rounded(px(CORNER_RADIUS_SM))
            .bg(Hsla::from(if theme.is_dark {
                SLATE_900.with_alpha(0.92)
            } else {
                WHITE.with_alpha(0.92)
            }))
            .border_1()
            .border_color(Hsla::from(if theme.is_dark {
                SLATE_800
            } else {
                SLATE_200
            }))
            .shadow_md();

        // New Note Button
        dock_controls = dock_controls.child(
            ui::primitives::Button::new("+ New Note")
                .with_variant(ui::primitives::button::ButtonVariant::Primary)
                .with_size(ui::primitives::button::ButtonSize::Sm),
        );

        // Zoom Controls
        dock_controls = dock_controls
            .child(
                ui::primitives::Button::new("-")
                    .with_variant(ui::primitives::button::ButtonVariant::Ghost)
                    .with_size(ui::primitives::button::ButtonSize::Sm),
            )
            .child(
                div()
                    .px(px(6.0))
                    .text_xs()
                    .text_color(Hsla::from(if theme.is_dark {
                        SLATE_300
                    } else {
                        SLATE_700
                    }))
                    .child(format!("{}%", zoom_pct)),
            )
            .child(
                ui::primitives::Button::new("+")
                    .with_variant(ui::primitives::button::ButtonVariant::Ghost)
                    .with_size(ui::primitives::button::ButtonSize::Sm),
            )
            .child(
                ui::primitives::Button::new("100%")
                    .with_variant(ui::primitives::button::ButtonVariant::Ghost)
                    .with_size(ui::primitives::button::ButtonSize::Sm),
            );

        // Search trigger
        dock_controls = dock_controls.child(
            ui::primitives::Button::new("🔍 Search (Ctrl+K)")
                .with_variant(ui::primitives::button::ButtonVariant::Secondary)
                .with_size(ui::primitives::button::ButtonSize::Sm),
        );

        // Status Bar below Dock
        let status_bar = ui::components::StatusBar::new()
            .with_counts(self.state.notes.len(), selected_count)
            .with_zoom(self.state.camera.zoom);

        bottom_dock = bottom_dock.child(dock_controls).child(status_bar);
        canvas_container = canvas_container.child(bottom_dock);

        root = root.child(canvas_container);

        // 5. Desktop Modal Window Overlay (if open)
        if let Some(active_modal) = &self.state.active_modal {
            root = root.child(active_modal.clone());
        }

        root
    }
}
