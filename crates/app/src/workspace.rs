//! Primary GPUI Workspace View.
//!
//! Orchestrates the Infinite Canvas, interactive note cards, floating bottom command dock,
//! status bar, collapsible sidebar drawer, keyboard shortcut engine, and desktop modals.
//! Strictly zero emojis — all vector icons and clean typography.

use crate::state::AppState;
use domain::models::note::Point2D;
use gpui::prelude::*;
use gpui::*;
use ui::primitives::icon::Icon;
use ui::tokens::colors::*;
use ui::tokens::icons::{IconKind, IconSize};
use ui::tokens::radius::CORNER_RADIUS_SM;
use ui::views::modals_view::ActiveModal;

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

    /// Handle global keyboard shortcuts matching DiaryNote specifications
    pub fn handle_key_down(&mut self, key: &str, is_ctrl: bool, is_shift: bool, is_alt: bool) -> bool {
        match (is_ctrl, is_shift, is_alt, key) {
            // Escape: Cancel cut / clear selection / close modal
            (false, false, false, "Escape") => {
                if self.state.active_modal.is_some() {
                    self.state.close_modal();
                } else if !self.state.cut_note_ids.is_empty() {
                    self.state.cut_note_ids.clear();
                    self.state.status_message = "Cut cancelled".into();
                } else {
                    self.state.clear_selection();
                }
                true
            }
            // Ctrl + / : Open Keyboard Shortcuts cheatsheet
            (true, false, false, "/") | (true, false, false, "?") => {
                self.state.open_modal(ActiveModal::Shortcuts);
                true
            }
            // Ctrl + K : Search notes & command palette
            (true, false, false, "k") | (true, false, false, "K") => {
                self.state.open_modal(ActiveModal::Search {
                    query: String::new(),
                });
                true
            }
            // Ctrl + Z : Undo last action
            (true, false, false, "z") | (true, false, false, "Z") => {
                self.state.undo();
                true
            }
            // Ctrl + Y or Ctrl + Shift + Z : Redo last action
            (true, false, false, "y") | (true, false, false, "Y") | (true, true, false, "z") | (true, true, false, "Z") => {
                self.state.redo();
                true
            }
            // Ctrl + N or N : Create new note at center
            (true, false, false, "n") | (true, false, false, "N") | (false, false, false, "n") => {
                self.state.create_note_at_center(1280.0, 800.0);
                true
            }
            // Ctrl + Shift + D : Open / create Today's Daily Journal entry
            (true, true, false, "d") | (true, true, false, "D") => {
                self.state.create_daily_journal_entry(1280.0, 800.0);
                true
            }
            // Ctrl + B : Toggle notes sidebar drawer
            (true, false, false, "b") | (true, false, false, "B") => {
                self.state.toggle_sidebar();
                true
            }
            // Ctrl + L : Lock / unlock selected note(s)
            (true, false, false, "l") | (true, false, false, "L") => {
                self.state.toggle_lock_selected();
                true
            }
            // Ctrl + X : Cut selected note(s) for long-distance relocation
            (true, false, false, "x") | (true, false, false, "X") => {
                self.state.cut_selected_notes();
                true
            }
            // Ctrl + Shift + V or Ctrl + V : Paste / relocate cut notes
            (true, true, false, "v") | (true, true, false, "V") | (true, false, false, "v") | (true, false, false, "V") => {
                if !self.state.cut_note_ids.is_empty() {
                    let center = self.state.camera.screen_to_canvas(Point2D::new(640.0, 400.0));
                    self.state.paste_relocate_notes(center);
                    true
                } else {
                    false
                }
            }
            // Ctrl + A : Select all notes
            (true, false, false, "a") | (true, false, false, "A") => {
                self.state.select_all();
                true
            }
            // Delete / Backspace : Delete selected notes
            (false, false, false, "Delete") | (false, false, false, "Backspace") => {
                self.state.delete_selected_notes();
                true
            }
            // T : Toggle Dark / Light Canvas Theme
            (false, false, false, "t") | (false, false, false, "T") => {
                self.state.toggle_theme();
                true
            }
            // Z : Toggle Zen Mode
            (false, false, false, "z") => {
                self.state.toggle_zen_mode();
                true
            }
            // S : Toggle Snap to Grid (24px grid)
            (false, false, false, "s") | (false, false, false, "S") => {
                self.state.toggle_snap_to_grid();
                true
            }
            // C : Toggle Reference Connection Lines
            (false, false, false, "c") | (false, false, false, "C") => {
                self.state.toggle_connection_lines();
                true
            }
            // F : Fit all notes on canvas view
            (false, false, false, "f") | (false, false, false, "F") => {
                self.state.fit_all_notes(1280.0, 800.0);
                true
            }
            // H : Reset zoom (100% at center)
            (false, false, false, "h") | (false, false, false, "H") => {
                self.state.reset_camera();
                true
            }
            // Shift + Z or Shift + F : Focus & zoom to selected note
            (false, true, false, "z") | (false, true, false, "Z") | (false, true, false, "f") | (false, true, false, "F") => {
                self.state.focus_selected_note(1280.0, 800.0);
                true
            }
            // + or = : Zoom in
            (false, false, false, "+") | (false, false, false, "=") | (true, false, false, "+") | (true, false, false, "=") => {
                self.zoom_in();
                true
            }
            // - or _ : Zoom out
            (false, false, false, "-") | (false, false, false, "_") | (true, false, false, "-") | (true, false, false, "_") => {
                self.zoom_out();
                true
            }
            // 0 : Reset Zoom to 100%
            (false, false, false, "0") | (true, false, false, "0") => {
                self.state.reset_camera();
                true
            }
            _ => false,
        }
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
        if self.state.is_sidebar_open && !self.state.is_zen_mode {
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
            let is_cut = self.state.cut_note_ids.contains(&note.id);
            let is_editing = self.state.editing_note_id == Some(note.id);
            let screen_pos = self.state.camera.canvas_to_screen(note.position);

            let note_card_view = ui::views::NoteCardView::from_note(note, is_selected, is_editing);

            let mut card_wrapper = div()
                .absolute()
                .left(px(screen_pos.x))
                .top(px(screen_pos.y))
                .cursor_pointer();

            if is_cut {
                card_wrapper = card_wrapper.opacity(0.4);
            }

            card_wrapper = card_wrapper.child(note_card_view);
            canvas_container = canvas_container.child(card_wrapper);
        }

        // Render 2D Minimap in top-right corner (if not zen mode)
        if !self.state.is_zen_mode {
            let minimap = ui::components::Minimap::new();
            let minimap_wrapper = div().absolute().top_4().right_4().child(minimap);
            canvas_container = canvas_container.child(minimap_wrapper);
        }

        // 4. Floating Command Dock & Status Bar (Bottom Center)
        if !self.state.is_zen_mode {
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

            // New Note Button (strictly zero emojis)
            dock_controls = dock_controls.child(
                ui::primitives::Button::new("+ New Note (N)")
                    .with_variant(ui::primitives::button::ButtonVariant::Primary)
                    .with_size(ui::primitives::button::ButtonSize::Sm),
            );

            // Daily Journal Entry Button
            dock_controls = dock_controls.child(
                ui::primitives::Button::new("Journal (Ctrl+Shift+D)")
                    .with_variant(ui::primitives::button::ButtonVariant::Ghost)
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

            // Light / Dark Theme Toggle Button (strictly zero emojis)
            let theme_label = if theme.is_dark { "Light (T)" } else { "Dark (T)" };
            let theme_icon_kind = if theme.is_dark { IconKind::Sun } else { IconKind::Moon };
            let theme_btn = div()
                .flex()
                .items_center()
                .gap_1()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(theme_icon_kind).with_size(IconSize::Sm))
                .child(div().text_xs().text_color(Hsla::from(theme.text)).child(theme_label));

            dock_controls = dock_controls.child(theme_btn);

            // Search Trigger (strictly zero emojis)
            dock_controls = dock_controls.child(
                ui::primitives::Button::new("Search (Ctrl+K)")
                    .with_variant(ui::primitives::button::ButtonVariant::Secondary)
                    .with_size(ui::primitives::button::ButtonSize::Sm),
            );

            // Shortcuts cheatsheet trigger
            dock_controls = dock_controls.child(
                ui::primitives::Button::new("Shortcuts (Ctrl+/)")
                    .with_variant(ui::primitives::button::ButtonVariant::Ghost)
                    .with_size(ui::primitives::button::ButtonSize::Sm),
            );

            // Status Bar below Dock
            let status_bar = ui::components::StatusBar::new()
                .with_counts(self.state.notes.len(), selected_count)
                .with_zoom(self.state.camera.zoom);

            bottom_dock = bottom_dock.child(dock_controls).child(status_bar);
            canvas_container = canvas_container.child(bottom_dock);
        }

        root = root.child(canvas_container);

        // 5. Desktop Modal Window Overlay (if open)
        if let Some(active_modal) = &self.state.active_modal {
            root = root.child(active_modal.clone());
        }

        root
    }
}

#[cfg(test)]
mod tests {
    use super::WorkspaceView;
    use ui::views::modals_view::ActiveModal;

    #[test]
    fn test_workspace_view_shortcuts() {
        let mut workspace = WorkspaceView::new();

        // Test theme toggle shortcut T
        assert!(workspace.state.theme.is_dark);
        let handled = workspace.handle_key_down("t", false, false, false);
        assert!(handled);
        assert!(!workspace.state.theme.is_dark);

        // Test create note shortcut N
        let initial_count = workspace.state.notes.len();
        let handled = workspace.handle_key_down("n", false, false, false);
        assert!(handled);
        assert_eq!(workspace.state.notes.len(), initial_count + 1);

        // Test undo shortcut Ctrl+Z
        let handled = workspace.handle_key_down("z", true, false, false);
        assert!(handled);
        assert_eq!(workspace.state.notes.len(), initial_count);

        // Test search shortcut Ctrl+K
        let handled = workspace.handle_key_down("k", true, false, false);
        assert!(handled);
        assert_eq!(
            workspace.state.active_modal,
            Some(ActiveModal::Search {
                query: String::new()
            })
        );

        // Test escape closes modal
        let handled = workspace.handle_key_down("Escape", false, false, false);
        assert!(handled);
        assert_eq!(workspace.state.active_modal, None);
    }
}
