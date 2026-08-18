//! Primary GPUI Workspace View.
//!
//! Orchestrates the Infinite Canvas, interactive note cards, floating bottom command dock,
//! status bar, collapsible sidebar drawer, keyboard shortcut engine, and desktop modals.
//! Fully interactive with mouse dragging, resizing, panning, zooming, checklist toggling,
//! group frames, connection lines, header actions, and shortcuts.
//! Strictly zero emojis — all vector icons and clean typography.

use crate::state::AppState;
use domain::models::note::{Mood, NoteId, Point2D, Size2D};
use gpui::prelude::*;
use gpui::*;
use std::collections::HashMap;
use ui::components::markdown::{parse_markdown, MarkdownBlock};
use ui::primitives::checkbox::Checkbox;
use ui::primitives::icon::Icon;
use ui::tokens::colors::*;
use ui::tokens::icons::{IconKind, IconSize};
use ui::tokens::paper_themes::PaperThemeKind;
use ui::tokens::radius::{CORNER_RADIUS_SM, CORNER_RADIUS_XS};
use ui::views::modals_view::ActiveModal;

/// Active interaction state for canvas and card drag operations
#[derive(Debug, Clone, PartialEq)]
pub enum DragState {
    /// Canvas background panning
    Panning {
        start_mouse: Point<Pixels>,
        start_pan: Point2D,
    },
    /// Moving one or more selected note cards
    DraggingNotes {
        start_mouse: Point<Pixels>,
        initial_positions: HashMap<NoteId, Point2D>,
    },
    /// Interactive card resizing via corner handle
    ResizingNote {
        note_id: NoteId,
        start_mouse: Point<Pixels>,
        initial_size: (f32, f32),
    },
    /// 2D Rubber-band box selection
    SelectingBox {
        start_screen: Point<Pixels>,
        current_screen: Point<Pixels>,
    },
}

pub struct WorkspaceView {
    pub state: AppState,
    pub focus_handle: Option<FocusHandle>,
    pub drag_state: Option<DragState>,
}

impl WorkspaceView {
    pub fn new(cx: &mut Context<Self>) -> Self {
        Self {
            state: AppState::new(),
            focus_handle: Some(cx.focus_handle()),
            drag_state: None,
        }
    }

    #[cfg(test)]
    pub fn for_testing() -> Self {
        Self {
            state: AppState::new(),
            focus_handle: None,
            drag_state: None,
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
            // Ctrl + G : Group selected notes
            (true, false, false, "g") | (true, false, false, "G") => {
                self.state.group_selected_notes();
                true
            }
            // Ctrl + Shift + G : Ungroup selected notes
            (true, true, false, "g") | (true, true, false, "G") => {
                self.state.ungroup_selected_notes();
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
                self.state.select_all_notes();
                true
            }
            // Delete or Backspace : Delete selected notes
            (false, false, false, "Delete") | (false, false, false, "Backspace") => {
                if !self.state.selected_note_ids.is_empty() {
                    self.state.delete_selected_notes();
                    true
                } else {
                    false
                }
            }
            // T : Toggle Dark and Light surface theme
            (false, false, false, "t") | (false, false, false, "T") => {
                self.state.toggle_theme();
                true
            }
            // Z : Toggle Zen Mode
            (false, false, false, "z") | (false, false, false, "Z") => {
                self.state.toggle_zen_mode();
                true
            }
            // S : Toggle Snap to Grid
            (false, false, false, "s") | (false, false, false, "S") => {
                self.state.toggle_snap_to_grid();
                true
            }
            // C : Toggle Connection Lines
            (false, false, false, "c") | (false, false, false, "C") => {
                self.state.toggle_connection_lines();
                true
            }
            // F : Fit all notes in viewport
            (false, false, false, "f") | (false, false, false, "F") => {
                self.state.fit_notes_in_view(1280.0, 800.0);
                true
            }
            // H : Reset camera zoom to 100%
            (false, false, false, "h") | (false, false, false, "H") => {
                self.state.reset_camera();
                true
            }
            // Shift + Z or Shift + F : Focus camera on selected note
            (false, true, false, "z") | (false, true, false, "Z") | (false, true, false, "f") | (false, true, false, "F") => {
                self.state.focus_selected_note(1280.0, 800.0);
                true
            }
            // + or = : Zoom in
            (false, false, false, "+") | (false, false, false, "=") => {
                self.zoom_in();
                true
            }
            // - or _ : Zoom out
            (false, false, false, "-") | (false, false, false, "_") => {
                self.zoom_out();
                true
            }
            // 0 : Reset camera
            (false, false, false, "0") => {
                self.state.reset_camera();
                true
            }
            _ => false,
        }
    }
}

impl Render for WorkspaceView {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = self.state.theme.clone();
        let selected_count = self.state.selected_note_ids.len();

        // 1. Root Container (Window bounds) with keyboard listener and focus tracking
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

        if let Some(handle) = &self.focus_handle {
            root = root.track_focus(handle);
        }

        root = root.on_key_down(cx.listener(|this, event: &KeyDownEvent, _window, cx| {
            let key = event.keystroke.key.as_str();
            let is_ctrl = event.keystroke.modifiers.control || event.keystroke.modifiers.platform;
            let is_shift = event.keystroke.modifiers.shift;
            let is_alt = event.keystroke.modifiers.alt;

            if this.handle_key_down(key, is_ctrl, is_shift, is_alt) {
                cx.notify();
            }
        }));

        // 2. Sidebar Drawer (Left side) with interactive note rows
        if self.state.is_sidebar_open && !self.state.is_zen_mode {
            let mut sidebar_container = div()
                .w(px(260.0))
                .h_full()
                .flex()
                .flex_col()
                .bg(Hsla::from(if theme.is_dark {
                    SLATE_900
                } else {
                    WHITE
                }))
                .border_r_1()
                .border_color(Hsla::from(if theme.is_dark {
                    SLATE_800
                } else {
                    SLATE_200
                }))
                .p_3()
                .gap_2();

            // Sidebar Header
            let sidebar_header = div()
                .flex()
                .items_center()
                .justify_between()
                .pb_2()
                .border_b_1()
                .border_color(Hsla::from(theme.border_subtle))
                .child(
                    div()
                        .font_weight(FontWeight::BOLD)
                        .text_xs()
                        .text_color(Hsla::from(theme.text))
                        .child("All Notes"),
                )
                .child(
                    div()
                        .cursor_pointer()
                        .text_xs()
                        .text_color(Hsla::from(theme.text_muted))
                        .hover(|s| s.text_color(Hsla::from(theme.text)))
                        .child("✕")
                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                            this.state.is_sidebar_open = false;
                            cx.notify();
                        })),
                );
            sidebar_container = sidebar_container.child(sidebar_header);

            // Sidebar Note Items
            let mut list = div().flex().flex_col().gap_1().overflow_hidden().flex_1();
            for note in &self.state.notes {
                let note_id = note.id;
                let is_active = self.state.selected_note_ids.contains(&note_id);
                let title = if note.title.is_empty() { "Untitled" } else { &note.title };

                let item = div()
                    .flex()
                    .flex_col()
                    .p_2()
                    .rounded(px(CORNER_RADIUS_SM))
                    .cursor_pointer()
                    .bg(Hsla::from(if is_active {
                        if theme.is_dark { SLATE_800 } else { SLATE_200 }
                    } else {
                        TRANSPARENT
                    }))
                    .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                    .child(
                        div()
                            .font_weight(FontWeight::MEDIUM)
                            .text_xs()
                            .text_color(Hsla::from(theme.text))
                            .child(title.to_string()),
                    )
                    .child(
                        div()
                            .text_xs()
                            .text_color(Hsla::from(theme.text_dim))
                            .child(note.updated_at.format("%b %d, %H:%M").to_string()),
                    )
                    .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                        this.state.select_note(note_id, false);
                        this.state.focus_selected_note(1280.0, 800.0);
                        cx.notify();
                    }));

                list = list.child(item);
            }
            sidebar_container = sidebar_container.child(list);
            root = root.child(sidebar_container);
        }

        // 3. Infinite Canvas Viewport (Main central area)
        let mut canvas_container = div()
            .relative()
            .flex_1()
            .h_full()
            .bg(Hsla::from(if theme.is_dark {
                SLATE_950
            } else {
                SLATE_50
            }))
            .overflow_hidden()
            // Mouse wheel zoom
            .on_scroll_wheel(cx.listener(|this, event: &ScrollWheelEvent, _window, cx| {
                let delta = match event.delta {
                    ScrollDelta::Pixels(p) => f32::from(p.y),
                    ScrollDelta::Lines(l) => l.y * 16.0,
                };
                if delta > 0.0 {
                    this.zoom_in();
                } else if delta < 0.0 {
                    this.zoom_out();
                }
                cx.notify();
            }))
            // Canvas background mouse down (pan or box select)
            .on_mouse_down(MouseButton::Middle, cx.listener(|this, event: &MouseDownEvent, _window, cx| {
                this.drag_state = Some(DragState::Panning {
                    start_mouse: event.position,
                    start_pan: Point2D::new(this.state.camera.pan_x, this.state.camera.pan_y),
                });
                cx.notify();
            }))
            .on_mouse_down(MouseButton::Right, cx.listener(|this, event: &MouseDownEvent, _window, cx| {
                this.drag_state = Some(DragState::Panning {
                    start_mouse: event.position,
                    start_pan: Point2D::new(this.state.camera.pan_x, this.state.camera.pan_y),
                });
                cx.notify();
            }))
            .on_mouse_down(MouseButton::Left, cx.listener(|this, event: &MouseDownEvent, _window, cx| {
                if event.click_count >= 2 {
                    // Double-click canvas creates note at cursor
                    let mouse_pos = Point2D::new(f32::from(event.position.x), f32::from(event.position.y));
                    let canvas_pos = this.state.camera.screen_to_canvas(mouse_pos);
                    this.state.create_note("Untitled Note", "", canvas_pos);
                } else {
                    // Single click starts rubber-band marquee selection
                    if !event.modifiers.shift {
                        this.state.clear_selection();
                    }
                    if this.state.active_modal.is_some() {
                        this.state.close_modal();
                    }
                    this.drag_state = Some(DragState::SelectingBox {
                        start_screen: event.position,
                        current_screen: event.position,
                    });
                }
                cx.notify();
            }))
            // Canvas mouse move (panning, note dragging, resizing, marquee selection)
            .on_mouse_move(cx.listener(|this, event: &MouseMoveEvent, _window, cx| {
                if let Some(drag) = &this.drag_state {
                    match drag {
                        DragState::Panning { start_mouse, start_pan } => {
                            let dx = f32::from(event.position.x) - f32::from(start_mouse.x);
                            let dy = f32::from(event.position.y) - f32::from(start_mouse.y);
                            this.state.camera.pan_x = start_pan.x + dx;
                            this.state.camera.pan_y = start_pan.y + dy;
                            cx.notify();
                        }
                        DragState::DraggingNotes { start_mouse, initial_positions } => {
                            let zoom = this.state.camera.zoom;
                            let dx = (f32::from(event.position.x) - f32::from(start_mouse.x)) / zoom;
                            let dy = (f32::from(event.position.y) - f32::from(start_mouse.y)) / zoom;

                            for (id, initial_pos) in initial_positions {
                                if let Some(note) = this.state.notes.iter_mut().find(|n| n.id == *id) {
                                    let mut new_x = initial_pos.x + dx;
                                    let mut new_y = initial_pos.y + dy;
                                    if this.state.snap_to_grid {
                                        new_x = (new_x / 24.0).round() * 24.0;
                                        new_y = (new_y / 24.0).round() * 24.0;
                                    }
                                    note.position = Point2D::new(new_x, new_y);
                                    note.touch();
                                }
                            }
                            cx.notify();
                        }
                        DragState::ResizingNote { note_id, start_mouse, initial_size } => {
                            let zoom = this.state.camera.zoom;
                            let dx = (f32::from(event.position.x) - f32::from(start_mouse.x)) / zoom;
                            let dy = (f32::from(event.position.y) - f32::from(start_mouse.y)) / zoom;

                            let mut new_w = (initial_size.0 + dx).max(240.0);
                            let mut new_h = (initial_size.1 + dy).max(160.0);
                            if this.state.snap_to_grid {
                                new_w = (new_w / 24.0).round() * 24.0;
                                new_h = (new_h / 24.0).round() * 24.0;
                            }

                            if let Some(note) = this.state.notes.iter_mut().find(|n| n.id == *note_id) {
                                note.size = Size2D::new_unchecked(new_w, new_h);
                                note.touch();
                            }
                            cx.notify();
                        }
                        DragState::SelectingBox { start_screen, .. } => {
                            let start = *start_screen;
                            this.drag_state = Some(DragState::SelectingBox {
                                start_screen: start,
                                current_screen: event.position,
                            });

                            let p1 = this.state.camera.screen_to_canvas(Point2D::new(f32::from(start.x), f32::from(start.y)));
                            let p2 = this.state.camera.screen_to_canvas(Point2D::new(f32::from(event.position.x), f32::from(event.position.y)));
                            this.state.select_notes_in_box(p1, p2);
                            cx.notify();
                        }
                    }
                }
            }))
            // Mouse up completes drag/pan/resize/marquee
            .on_mouse_up(MouseButton::Left, cx.listener(|this, _event: &MouseUpEvent, _window, cx| {
                if let Some(DragState::DraggingNotes { initial_positions, .. }) = &this.drag_state {
                    let positions_vec: Vec<(NoteId, Point2D)> = initial_positions.iter().map(|(&k, &v)| (k, v)).collect();
                    this.state.commit_notes_movement(&positions_vec);
                }
                this.drag_state = None;
                cx.notify();
            }))
            .on_mouse_up(MouseButton::Middle, cx.listener(|this, _event: &MouseUpEvent, _window, cx| {
                this.drag_state = None;
                cx.notify();
            }))
            .on_mouse_up(MouseButton::Right, cx.listener(|this, _event: &MouseUpEvent, _window, cx| {
                this.drag_state = None;
                cx.notify();
            }));

        // Render dynamic spatial dot grid tracking camera pan and zoom (matching React InfiniteCanvas)
        let base_pitch = 32.0_f32;
        let zoom = self.state.camera.zoom;
        let grid_pitch = base_pitch * zoom;
        let pitch = if grid_pitch < 16.0 {
            grid_pitch * 2.0
        } else if grid_pitch > 64.0 {
            grid_pitch / 2.0
        } else {
            grid_pitch
        };

        if pitch >= 8.0 {
            let offset_x = ((self.state.camera.pan_x * zoom) % pitch + pitch) % pitch;
            let offset_y = ((self.state.camera.pan_y * zoom) % pitch + pitch) % pitch;

            let mut grid_container = div()
                .absolute()
                .inset_0()
                .overflow_hidden();

            let mut y = offset_y - pitch;
            while y < 1400.0 {
                let mut x = offset_x - pitch;
                let mut row = div()
                    .absolute()
                    .top(px(y))
                    .left_0()
                    .right_0()
                    .h(px(2.0));

                while x < 2560.0 {
                    row = row.child(
                        div()
                            .absolute()
                            .left(px(x))
                            .w(px(1.5))
                            .h(px(1.5))
                            .rounded(px(0.75))
                            .bg(Hsla::from(theme.dot_grid))
                    );
                    x += pitch;
                }
                grid_container = grid_container.child(row);
                y += pitch;
            }
            canvas_container = canvas_container.child(grid_container);
        }

        // Render Group Frames (bounding containers around grouped notes)
        let mut rendered_groups = Vec::new();
        for note in &self.state.notes {
            if let Some(group_id) = &note.group_id {
                if !rendered_groups.contains(group_id) {
                    rendered_groups.push(group_id.clone());
                    if let Some(bounds) = self.state.get_group_bounds(group_id) {
                        let screen_min = self.state.camera.canvas_to_screen(Point2D::new(bounds.min_x, bounds.min_y));
                        let zoom = self.state.camera.zoom;
                        let frame_w = bounds.width() * zoom;
                        let frame_h = bounds.height() * zoom;

                        let gid = group_id.clone();
                        let mut frame_el = div()
                            .absolute()
                            .left(px(screen_min.x))
                            .top(px(screen_min.y))
                            .w(px(frame_w))
                            .h(px(frame_h))
                            .rounded(px(CORNER_RADIUS_SM))
                            .border_1()
                            .border_color(Hsla::from(BLUE_500.with_alpha(0.4)))
                            .bg(Hsla::from(BLUE_500.with_alpha(0.04)));

                        // Draggable & interactive group header badge
                        let header_badge = div()
                            .absolute()
                            .top(px(-12.0))
                            .left(px(12.0))
                            .flex()
                            .items_center()
                            .gap_1()
                            .px(px(8.0))
                            .py(px(2.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(BLUE_500))
                            .text_color(Hsla::from(WHITE))
                            .text_xs()
                            .font_weight(FontWeight::BOLD)
                            .shadow_sm()
                            .child(Icon::new(IconKind::Folder).with_size(IconSize::Xs))
                            .child("Group")
                            .child(
                                div()
                                    .cursor_pointer()
                                    .pl_1()
                                    .text_xs()
                                    .child("✕")
                                    .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                                        this.state.ungroup_group(&gid);
                                        cx.notify();
                                    })),
                            );

                        frame_el = frame_el.child(header_badge);
                        canvas_container = canvas_container.child(frame_el);
                    }
                }
            }
        }

        // Render Fully Interactive Note Cards on Canvas using camera projection
        for note in &self.state.notes {
            let note_id = note.id;
            let is_selected = self.state.selected_note_ids.contains(&note_id);
            let is_cut = self.state.cut_note_ids.contains(&note_id);
            let screen_pos = self.state.camera.canvas_to_screen(note.position);
            let paper = PaperThemeKind::from_name(note.color_theme.as_str()).config();
            let min_w = px(note.size.width);
            let min_h = px(note.size.height);

            // Note Card Container
            let mut card_el = div()
                .relative()
                .flex()
                .flex_col()
                .justify_between()
                .min_w(min_w)
                .min_h(min_h)
                .rounded(px(CORNER_RADIUS_SM))
                .bg(Hsla::from(paper.bg))
                .border_1()
                .border_color(Hsla::from(if is_selected { BLUE_500 } else { paper.border }));

            if is_selected {
                card_el = card_el.shadow_md();
            } else {
                card_el = card_el.shadow_sm();
            }

            // Interactive Note Header
            let mut header_el = div()
                .flex()
                .items_center()
                .justify_between()
                .h(px(36.0))
                .px(px(8.0))
                .border_b_1()
                .border_color(Hsla::from(paper.border))
                .rounded_t(px(CORNER_RADIUS_SM));

            // Header Left (Mood indicator + Title)
            let mood_icon = match note.mood {
                Mood::Great => IconKind::Flash,
                Mood::Good => IconKind::Smile,
                Mood::Neutral => IconKind::Coffee,
                Mood::Bad => IconKind::CloudRain,
                Mood::Terrible => IconKind::Moon,
                Mood::None => IconKind::Smile,
            };

            let mood_btn = div()
                .cursor_pointer()
                .p_1()
                .rounded(px(CORNER_RADIUS_XS))
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(mood_icon).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                    this.state.cycle_mood(note_id);
                    cx.notify();
                }));

            let title_text = if note.title.is_empty() { "Untitled" } else { &note.title };
            let title_el = div()
                .flex_1()
                .px(px(4.0))
                .font_weight(FontWeight::BOLD)
                .text_xs()
                .text_color(Hsla::from(paper.text))
                .child(title_text.to_string());

            let header_left = div().flex().items_center().gap_1().child(mood_btn).child(title_el);

            // Header Right (Favorite, Pin, Lock, Theme Palette, Duplicate, Delete)
            let fav_btn = div()
                .cursor_pointer()
                .p_1()
                .rounded(px(CORNER_RADIUS_XS))
                .text_color(Hsla::from(if note.is_favorite { AMBER_500 } else { paper.subtext }))
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(IconKind::Star).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                    this.state.toggle_favorite_note(note_id);
                    cx.notify();
                }));

            let pin_btn = div()
                .cursor_pointer()
                .p_1()
                .rounded(px(CORNER_RADIUS_XS))
                .text_color(Hsla::from(if note.is_pinned { BLUE_500 } else { paper.subtext }))
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(IconKind::Pin).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                    this.state.toggle_pin_note(note_id);
                    cx.notify();
                }));

            let lock_btn = div()
                .cursor_pointer()
                .p_1()
                .rounded(px(CORNER_RADIUS_XS))
                .text_color(Hsla::from(if note.is_locked { ROSE_500 } else { paper.subtext }))
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(IconKind::SecurityLock).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                    this.state.toggle_lock_note(note_id);
                    cx.notify();
                }));

            let dup_btn = div()
                .cursor_pointer()
                .p_1()
                .rounded(px(CORNER_RADIUS_XS))
                .text_color(Hsla::from(paper.subtext))
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(IconKind::Copy).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                    this.state.duplicate_note(note_id);
                    cx.notify();
                }));

            let del_btn = div()
                .cursor_pointer()
                .p_1()
                .rounded(px(CORNER_RADIUS_XS))
                .text_color(Hsla::from(paper.subtext))
                .hover(|s| s.bg(Hsla::from(ROSE_500.with_alpha(0.2))).text_color(Hsla::from(ROSE_500)))
                .child(Icon::new(IconKind::Trash).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                    this.state.delete_note(note_id);
                    cx.notify();
                }));

            let header_right = div()
                .flex()
                .items_center()
                .gap_1()
                .child(fav_btn)
                .child(pin_btn)
                .child(lock_btn)
                .child(dup_btn)
                .child(del_btn);

            header_el = header_el.child(header_left).child(header_right);
            card_el = card_el.child(header_el);

            // Interactive Note Body with Rich Markdown & Clickable Checklist items
            let mut body_el = div().flex_1().p(px(10.0)).flex().flex_col().gap_2();
            let blocks = parse_markdown(&note.body);

            // Compute checklist progress if items exist
            let mut total_checklists = 0;
            let mut completed_checklists = 0;

            for block in &blocks {
                if let MarkdownBlock::ChecklistItem { completed, .. } = block {
                    total_checklists += 1;
                    if *completed {
                        completed_checklists += 1;
                    }
                }
            }

            if total_checklists > 0 {
                let progress_pct = (completed_checklists as f32 / total_checklists as f32) * 100.0;
                let progress_bar = div()
                    .w_full()
                    .h(px(3.0))
                    .bg(Hsla::from(paper.border))
                    .rounded_full()
                    .overflow_hidden()
                    .child(
                        div()
                            .h_full()
                            .w(px(progress_pct * 2.4))
                            .bg(Hsla::from(if completed_checklists == total_checklists { EMERALD_500 } else { BLUE_500 })),
                    );
                card_el = card_el.child(progress_bar);
            }

            for block in blocks {
                match block {
                    MarkdownBlock::ChecklistItem { completed, text, index } => {
                        let row = div()
                            .flex()
                            .items_center()
                            .gap_2()
                            .py(px(2.0))
                            .cursor_pointer()
                            .child(
                                Checkbox::new("")
                                    .with_checked(completed)
                                    .with_theme(theme.clone()),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(Hsla::from(if completed { paper.subtext } else { paper.text }))
                                    .child(text),
                            )
                            .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                                this.state.toggle_checklist_item(note_id, index);
                                cx.notify();
                            }));
                        body_el = body_el.child(row);
                    }
                    MarkdownBlock::Heading { level, text } => {
                        let mut heading = div().font_weight(FontWeight::BOLD).text_color(Hsla::from(paper.text));
                        match level {
                            1 => heading = heading.text_base(),
                            2 => heading = heading.text_sm(),
                            _ => heading = heading.text_xs(),
                        }
                        body_el = body_el.child(heading.child(text));
                    }
                    MarkdownBlock::Paragraph(text) => {
                        let p = div().text_xs().line_height(px(18.0)).text_color(Hsla::from(paper.text)).child(text);
                        body_el = body_el.child(p);
                    }
                    MarkdownBlock::BulletItem(text) => {
                        let item = div()
                            .flex()
                            .items_start()
                            .gap_2()
                            .text_xs()
                            .child(div().text_color(Hsla::from(paper.subtext)).child("•"))
                            .child(div().text_color(Hsla::from(paper.text)).child(text));
                        body_el = body_el.child(item);
                    }
                    MarkdownBlock::NumberedItem { number, text } => {
                        let item = div()
                            .flex()
                            .items_start()
                            .gap_2()
                            .text_xs()
                            .child(div().text_color(Hsla::from(paper.subtext)).child(format!("{}.", number)))
                            .child(div().text_color(Hsla::from(paper.text)).child(text));
                        body_el = body_el.child(item);
                    }
                    MarkdownBlock::CodeBlock { language: _, code } => {
                        let code_box = div()
                            .p(px(6.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(paper.border))
                            .text_xs()
                            .font_family(".SystemUIFont")
                            .text_color(Hsla::from(paper.text))
                            .child(code);
                        body_el = body_el.child(code_box);
                    }
                    MarkdownBlock::Blockquote(text) => {
                        let quote = div()
                            .pl(px(6.0))
                            .border_l_2()
                            .border_color(Hsla::from(paper.border))
                            .text_xs()
                            .italic()
                            .text_color(Hsla::from(paper.subtext))
                            .child(text);
                        body_el = body_el.child(quote);
                    }
                    MarkdownBlock::ThematicBreak => {
                        let hr = div().w_full().h(px(1.0)).my(px(4.0)).bg(Hsla::from(paper.border));
                        body_el = body_el.child(hr);
                    }
                }
            }

            card_el = card_el.child(body_el);

            // Bottom-Right Corner Resize Grip Handle
            let resize_handle = div()
                .absolute()
                .bottom_0()
                .right_0()
                .w(px(14.0))
                .h(px(14.0))
                .flex()
                .items_end()
                .justify_end()
                .p(px(2.0))
                .cursor_pointer()
                .text_color(Hsla::from(paper.subtext.with_alpha(0.6)))
                .child("⌟")
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, event: &MouseDownEvent, _window, cx| {
                    if let Some(n) = this.state.notes.iter().find(|n| n.id == note_id) {
                        this.drag_state = Some(DragState::ResizingNote {
                            note_id,
                            start_mouse: event.position,
                            initial_size: (n.size.width, n.size.height),
                        });
                        cx.notify();
                    }
                }));
            card_el = card_el.child(resize_handle);

            // Note Toolbar
            let toolbar = ui::components::NoteToolbar::new(note_id);
            card_el = card_el.child(toolbar);

            // Wrap Card in spatial canvas coordinates with Drag listener
            let mut card_wrapper = div()
                .absolute()
                .left(px(screen_pos.x))
                .top(px(screen_pos.y))
                .cursor_pointer()
                .on_mouse_down(MouseButton::Left, cx.listener(move |this, event: &MouseDownEvent, _window, cx| {
                    let is_shift = event.modifiers.shift;
                    if !this.state.selected_note_ids.contains(&note_id) {
                        this.state.select_note(note_id, is_shift);
                    }

                    // Prepare drag initial positions for all selected notes
                    let mut positions = HashMap::new();
                    for id in &this.state.selected_note_ids {
                        if let Some(n) = this.state.notes.iter().find(|n| n.id == *id) {
                            positions.insert(*id, n.position);
                        }
                    }

                    this.drag_state = Some(DragState::DraggingNotes {
                        start_mouse: event.position,
                        initial_positions: positions,
                    });
                    cx.notify();
                }));

            if is_cut {
                card_wrapper = card_wrapper.opacity(0.4);
            }

            card_wrapper = card_wrapper.child(card_el);
            canvas_container = canvas_container.child(card_wrapper);
        }

        // Render Rubber-band Selection Box (if selecting)
        if let Some(DragState::SelectingBox { start_screen, current_screen }) = &self.drag_state {
            let min_x = f32::from(start_screen.x).min(f32::from(current_screen.x));
            let max_x = f32::from(start_screen.x).max(f32::from(current_screen.x));
            let min_y = f32::from(start_screen.y).min(f32::from(current_screen.y));
            let max_y = f32::from(start_screen.y).max(f32::from(current_screen.y));
            let w = max_x - min_x;
            let h = max_y - min_y;

            let box_el = div()
                .absolute()
                .left(px(min_x))
                .top(px(min_y))
                .w(px(w))
                .h(px(h))
                .bg(Hsla::from(BLUE_500.with_alpha(0.12)))
                .border_1()
                .border_color(Hsla::from(BLUE_500));
            canvas_container = canvas_container.child(box_el);
        }

        // Render 2D Minimap in top-right corner (if not zen mode)
        if !self.state.is_zen_mode {
            let minimap_notes: Vec<ui::components::MinimapNote> = self.state.notes.iter().map(|n| {
                ui::components::MinimapNote {
                    id: n.id,
                    x: n.position.x,
                    y: n.position.y,
                    width: n.size.width,
                    height: n.size.height,
                    is_selected: self.state.selected_note_ids.contains(&n.id),
                }
            }).collect();

            let minimap = ui::components::Minimap::new()
                .with_notes(minimap_notes)
                .with_camera(self.state.camera.pan_x, self.state.camera.pan_y, self.state.camera.zoom)
                .with_viewport_bounds(1280.0, 800.0)
                .with_theme(theme.clone());

            let minimap_wrapper = div()
                .absolute()
                .top_4()
                .right_4()
                .child(minimap);
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

            // Interactive Batch Action Bar (if 2+ notes are selected)
            if selected_count >= 2 {
                let batch_bar = div()
                    .flex()
                    .items_center()
                    .gap_2()
                    .px(px(12.0))
                    .py(px(6.0))
                    .rounded(px(CORNER_RADIUS_SM))
                    .bg(Hsla::from(if theme.is_dark { SLATE_900 } else { WHITE }))
                    .border_1()
                    .border_color(Hsla::from(BLUE_500))
                    .shadow_lg()
                    .child(
                        div()
                            .text_xs()
                            .font_weight(FontWeight::BOLD)
                            .text_color(Hsla::from(BLUE_500))
                            .child(format!("{} notes selected", selected_count)),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(theme.sub_surface))
                            .text_xs()
                            .text_color(Hsla::from(theme.text))
                            .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                            .child("Align Top")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.align_selected_notes_top();
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(theme.sub_surface))
                            .text_xs()
                            .text_color(Hsla::from(theme.text))
                            .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                            .child("Align Left")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.align_selected_notes_left();
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(theme.sub_surface))
                            .text_xs()
                            .text_color(Hsla::from(theme.text))
                            .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                            .child("Grid Pack")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.pack_selected_notes_grid();
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(theme.sub_surface))
                            .text_xs()
                            .text_color(Hsla::from(theme.text))
                            .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                            .child("Group")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.group_selected_notes();
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(theme.sub_surface))
                            .text_xs()
                            .text_color(Hsla::from(theme.text))
                            .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                            .child("Duplicate")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.duplicate_selected_notes();
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(AMBER_500.with_alpha(0.2)))
                            .border_1()
                            .border_color(Hsla::from(AMBER_500.with_alpha(0.5)))
                            .text_xs()
                            .font_weight(FontWeight::BOLD)
                            .text_color(Hsla::from(AMBER_500))
                            .hover(|s| s.bg(Hsla::from(AMBER_500.with_alpha(0.3))))
                            .child("Merge with AI")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                let sel_ids = this.state.selected_note_ids.clone();
                                let selected: Vec<(String, String)> = this.state.notes.iter()
                                    .filter(|n| sel_ids.contains(&n.id))
                                    .map(|n| (n.title.clone(), n.body.clone()))
                                    .collect();

                                if !selected.is_empty() {
                                    let avg_x = this.state.notes.iter().filter(|n| sel_ids.contains(&n.id)).map(|n| n.position.x).sum::<f32>() / selected.len() as f32;
                                    let avg_y = this.state.notes.iter().filter(|n| sel_ids.contains(&n.id)).map(|n| n.position.y).sum::<f32>() / selected.len() as f32;
                                    
                                    let mut synthesized_body = String::from("## Synthesis & Key Points\n\n");
                                    for (t, b) in &selected {
                                        synthesized_body.push_str(&format!("### {}\n{}\n\n", t, b));
                                    }
                                    let new_id = this.state.create_note("AI Synthesized Note", synthesized_body, Point2D::new(avg_x + 320.0, avg_y));
                                    this.state.select_note(new_id, false);
                                    this.state.status_message = "Synthesized selected notes with AI".into();
                                }
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .py(px(4.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .bg(Hsla::from(ROSE_600))
                            .text_xs()
                            .text_color(Hsla::from(WHITE))
                            .hover(|s| s.bg(Hsla::from(ROSE_500)))
                            .child("Delete")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.delete_selected_notes();
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .cursor_pointer()
                            .px(px(6.0))
                            .text_xs()
                            .text_color(Hsla::from(theme.text_muted))
                            .hover(|s| s.text_color(Hsla::from(theme.text)))
                            .child("✕")
                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                this.state.clear_selection();
                                cx.notify();
                            })),
                    );

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

            // + New Note Button (strictly zero emojis)
            let new_note_btn = div()
                .flex()
                .items_center()
                .px(px(10.0))
                .py(px(6.0))
                .rounded(px(CORNER_RADIUS_SM))
                .bg(Hsla::from(if theme.is_dark { WHITE } else { SLATE_900 }))
                .text_color(Hsla::from(if theme.is_dark { SLATE_900 } else { WHITE }))
                .text_xs()
                .font_weight(FontWeight::MEDIUM)
                .cursor_pointer()
                .hover(|s| s.opacity(0.9))
                .child("+ New Note (N)")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.create_note_at_center(1280.0, 800.0);
                    cx.notify();
                }));
            dock_controls = dock_controls.child(new_note_btn);

            // Daily Journal Entry Button
            let journal_btn = div()
                .flex()
                .items_center()
                .px(px(8.0))
                .py(px(6.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_color(Hsla::from(theme.text))
                .text_xs()
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("Journal")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.create_daily_journal_entry(1280.0, 800.0);
                    cx.notify();
                }));
            dock_controls = dock_controls.child(journal_btn);

            // Snap-to-Grid toggle button
            let grid_btn = div()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_xs()
                .text_color(Hsla::from(if self.state.snap_to_grid { BLUE_500 } else { theme.text_muted }))
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("Grid")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.toggle_snap_to_grid();
                    cx.notify();
                }));
            dock_controls = dock_controls.child(grid_btn);

            // Zoom Controls (-, %, +)
            let zoom_out_btn = div()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_xs()
                .text_color(Hsla::from(theme.text_muted))
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("-")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.zoom_out();
                    cx.notify();
                }));

            let zoom_pct_btn = div()
                .px(px(6.0))
                .text_xs()
                .text_color(Hsla::from(theme.text))
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(format!("{}%", zoom_pct))
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.reset_camera();
                    cx.notify();
                }));

            let zoom_in_btn = div()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_xs()
                .text_color(Hsla::from(theme.text_muted))
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("+")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.zoom_in();
                    cx.notify();
                }));

            dock_controls = dock_controls.child(zoom_out_btn).child(zoom_pct_btn).child(zoom_in_btn);

            // Fit All Button
            let fit_btn = div()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_xs()
                .text_color(Hsla::from(theme.text_muted))
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("Fit (F)")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.fit_notes_in_view(1280.0, 800.0);
                    cx.notify();
                }));
            dock_controls = dock_controls.child(fit_btn);

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
                .child(div().text_xs().text_color(Hsla::from(theme.text)).child(theme_label))
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.toggle_theme();
                    cx.notify();
                }));
            dock_controls = dock_controls.child(theme_btn);

            // Search Trigger (strictly zero emojis)
            let search_btn = div()
                .flex()
                .items_center()
                .px(px(8.0))
                .py(px(6.0))
                .rounded(px(CORNER_RADIUS_SM))
                .bg(Hsla::from(theme.sub_surface))
                .text_color(Hsla::from(theme.text))
                .text_xs()
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("Search (Ctrl+K)")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.open_modal(ActiveModal::Search {
                        query: String::new(),
                    });
                    cx.notify();
                }));
            dock_controls = dock_controls.child(search_btn);

            // Settings Trigger
            let settings_btn = div()
                .flex()
                .items_center()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_color(Hsla::from(theme.text_muted))
                .text_xs()
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child(Icon::new(IconKind::Settings).with_size(IconSize::Sm))
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.open_modal(ActiveModal::CanvasSettings {
                        active_tab: "canvas".into(),
                    });
                    cx.notify();
                }));
            dock_controls = dock_controls.child(settings_btn);

            // Shortcuts cheatsheet trigger
            let shortcuts_btn = div()
                .flex()
                .items_center()
                .px(px(6.0))
                .py(px(4.0))
                .rounded(px(CORNER_RADIUS_SM))
                .text_color(Hsla::from(theme.text_muted))
                .text_xs()
                .cursor_pointer()
                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                .child("?")
                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                    this.state.open_modal(ActiveModal::Shortcuts);
                    cx.notify();
                }));
            dock_controls = dock_controls.child(shortcuts_btn);

            // Status Bar below Dock
            let save_status = if self.state.is_saving {
                ui::components::SaveStatus::Saving
            } else if self.state.save_error.is_some() {
                ui::components::SaveStatus::Error
            } else {
                ui::components::SaveStatus::Saved
            };

            let status_bar = ui::components::StatusBar::new()
                .with_save_status(save_status)
                .with_counts(self.state.notes.len(), selected_count)
                .with_zoom(self.state.camera.zoom)
                .with_theme(theme.clone());

            bottom_dock = bottom_dock.child(dock_controls).child(status_bar);
            canvas_container = canvas_container.child(bottom_dock);
        }

        root = root.child(canvas_container);

        // 5. Desktop Modal Window Overlay (Interactive Search, Shortcuts, Security, Settings, Calendar)
        if let Some(active_modal) = &self.state.active_modal {
            match active_modal {
                ActiveModal::Search { query } => {
                    let mut modal_backdrop = div()
                        .absolute()
                        .inset_0()
                        .bg(Hsla::from(SLATE_950.with_alpha(0.6)))
                        .flex()
                        .items_start()
                        .justify_center()
                        .pt_20()
                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                            this.state.close_modal();
                            cx.notify();
                        }));

                    let mut dialog_card = div()
                        .w(px(540.0))
                        .max_h(px(480.0))
                        .flex()
                        .flex_col()
                        .rounded(px(CORNER_RADIUS_SM))
                        .bg(Hsla::from(if theme.is_dark { SLATE_900 } else { WHITE }))
                        .border_1()
                        .border_color(Hsla::from(theme.border))
                        .shadow_xl()
                        .p_4()
                        .gap_3()
                        .on_mouse_down(MouseButton::Left, cx.listener(|_this, _event: &MouseDownEvent, _window, _cx| {
                            // Stop propagation to backdrop
                        }));

                    // Search Header
                    let search_input_box = div()
                        .flex()
                        .items_center()
                        .gap_2()
                        .px(px(10.0))
                        .py(px(8.0))
                        .rounded(px(CORNER_RADIUS_SM))
                        .bg(Hsla::from(theme.sub_surface))
                        .border_1()
                        .border_color(Hsla::from(BLUE_500))
                        .child(Icon::new(IconKind::Search).with_size(IconSize::Sm))
                        .child(
                            div()
                                .text_sm()
                                .text_color(Hsla::from(if query.is_empty() { theme.text_muted } else { theme.text }))
                                .child(if query.is_empty() { "Type to search notes...".to_string() } else { query.clone() }),
                        );

                    dialog_card = dialog_card.child(search_input_box);

                    // Search Results List
                    let mut results_list = div().flex().flex_col().gap_1().overflow_hidden().flex_1();
                    let q_lower = query.to_lowercase();
                    let matching_notes: Vec<&domain::models::note::Note> = self.state.notes.iter()
                        .filter(|n| {
                            if q_lower.is_empty() {
                                true
                            } else {
                                n.title.to_lowercase().contains(&q_lower)
                                    || n.body.to_lowercase().contains(&q_lower)
                                    || n.tags.iter().any(|t| t.to_lowercase().contains(&q_lower))
                            }
                        })
                        .collect();

                    if matching_notes.is_empty() {
                        let empty_el = div()
                            .p_4()
                            .flex()
                            .items_center()
                            .justify_center()
                            .text_xs()
                            .text_color(Hsla::from(theme.text_muted))
                            .child("No notes matching search query");
                        results_list = results_list.child(empty_el);
                    } else {
                        for note in matching_notes {
                            let note_id = note.id;
                            let title = if note.title.is_empty() { "Untitled" } else { &note.title };

                            let row = div()
                                .flex()
                                .flex_col()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .cursor_pointer()
                                .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                                .child(
                                    div()
                                        .font_weight(FontWeight::BOLD)
                                        .text_xs()
                                        .text_color(Hsla::from(theme.text))
                                        .child(title.to_string()),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(Hsla::from(theme.text_dim))
                                        .child(if note.body.len() > 80 { format!("{}...", &note.body[..80]) } else { note.body.clone() }),
                                )
                                .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.select_note(note_id, false);
                                    this.state.focus_selected_note(1280.0, 800.0);
                                    this.state.close_modal();
                                    cx.notify();
                                }));

                            results_list = results_list.child(row);
                        }
                    }

                    dialog_card = dialog_card.child(results_list);
                    modal_backdrop = modal_backdrop.child(dialog_card);
                    root = root.child(modal_backdrop);
                }
                ActiveModal::CanvasSettings { active_tab } => {
                    let cur_tab = active_tab.clone();
                    let mut modal_backdrop = div()
                        .absolute()
                        .inset_0()
                        .bg(Hsla::from(SLATE_950.with_alpha(0.6)))
                        .flex()
                        .items_start()
                        .justify_center()
                        .pt_20()
                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                            this.state.close_modal();
                            cx.notify();
                        }));

                    let mut dialog_card = div()
                        .w(px(640.0))
                        .max_h(px(520.0))
                        .flex()
                        .flex_col()
                        .rounded(px(CORNER_RADIUS_SM))
                        .bg(Hsla::from(if theme.is_dark { SLATE_900 } else { WHITE }))
                        .border_1()
                        .border_color(Hsla::from(theme.border))
                        .shadow_xl()
                        .p_5()
                        .gap_4()
                        .on_mouse_down(MouseButton::Left, cx.listener(|_this, _event: &MouseDownEvent, _window, _cx| {}));

                    // Modal Header with Close Button
                    let modal_header = div()
                        .flex()
                        .items_center()
                        .justify_between()
                        .border_b_1()
                        .border_color(Hsla::from(theme.border_subtle))
                        .pb_2()
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_sm()
                                .text_color(Hsla::from(theme.text))
                                .child("Preferences"),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .text_xs()
                                .text_color(Hsla::from(theme.text_muted))
                                .hover(|s| s.text_color(Hsla::from(theme.text)))
                                .child("✕")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.close_modal();
                                    cx.notify();
                                })),
                        );
                    dialog_card = dialog_card.child(modal_header);

                    // Preferences Tabs Header
                    let tabs_bar = div()
                        .flex()
                        .items_center()
                        .gap_2()
                        .child(
                            div()
                                .cursor_pointer()
                                .px(px(8.0))
                                .py(px(4.0))
                                .rounded(px(CORNER_RADIUS_XS))
                                .bg(Hsla::from(if cur_tab == "canvas" { theme.sub_surface_hover } else { TRANSPARENT }))
                                .text_xs()
                                .font_weight(FontWeight::MEDIUM)
                                .text_color(Hsla::from(if cur_tab == "canvas" { BLUE_500 } else { theme.text_muted }))
                                .child("Canvas")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.open_modal(ActiveModal::CanvasSettings { active_tab: "canvas".into() });
                                    cx.notify();
                                })),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .px(px(8.0))
                                .py(px(4.0))
                                .rounded(px(CORNER_RADIUS_XS))
                                .bg(Hsla::from(if cur_tab == "appearance" { theme.sub_surface_hover } else { TRANSPARENT }))
                                .text_xs()
                                .font_weight(FontWeight::MEDIUM)
                                .text_color(Hsla::from(if cur_tab == "appearance" { BLUE_500 } else { theme.text_muted }))
                                .child("Appearance")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.open_modal(ActiveModal::CanvasSettings { active_tab: "appearance".into() });
                                    cx.notify();
                                })),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .px(px(8.0))
                                .py(px(4.0))
                                .rounded(px(CORNER_RADIUS_XS))
                                .bg(Hsla::from(if cur_tab == "data" { theme.sub_surface_hover } else { TRANSPARENT }))
                                .text_xs()
                                .font_weight(FontWeight::MEDIUM)
                                .text_color(Hsla::from(if cur_tab == "data" { BLUE_500 } else { theme.text_muted }))
                                .child("Data & Backup")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.open_modal(ActiveModal::CanvasSettings { active_tab: "data".into() });
                                    cx.notify();
                                })),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .px(px(8.0))
                                .py(px(4.0))
                                .rounded(px(CORNER_RADIUS_XS))
                                .bg(Hsla::from(if cur_tab == "ai" { theme.sub_surface_hover } else { TRANSPARENT }))
                                .text_xs()
                                .font_weight(FontWeight::MEDIUM)
                                .text_color(Hsla::from(if cur_tab == "ai" { BLUE_500 } else { theme.text_muted }))
                                .child("AI Features")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.open_modal(ActiveModal::CanvasSettings { active_tab: "ai".into() });
                                    cx.notify();
                                })),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .px(px(8.0))
                                .py(px(4.0))
                                .rounded(px(CORNER_RADIUS_XS))
                                .bg(Hsla::from(if cur_tab == "about" { theme.sub_surface_hover } else { TRANSPARENT }))
                                .text_xs()
                                .font_weight(FontWeight::MEDIUM)
                                .text_color(Hsla::from(if cur_tab == "about" { BLUE_500 } else { theme.text_muted }))
                                .child("About")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.open_modal(ActiveModal::CanvasSettings { active_tab: "about".into() });
                                    cx.notify();
                                })),
                        );
                    dialog_card = dialog_card.child(tabs_bar);

                    // Tab Body
                    let mut tab_body = div().flex().flex_col().gap_3().flex_1().py_2();
                    match cur_tab.as_str() {
                        "canvas" => {
                            let snap_row = div()
                                .flex()
                                .items_center()
                                .justify_between()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().text_xs().text_color(Hsla::from(theme.text)).child("Snap to 24px Grid"))
                                .child(
                                    div()
                                        .cursor_pointer()
                                        .px(px(8.0))
                                        .py(px(2.0))
                                        .rounded(px(CORNER_RADIUS_XS))
                                        .bg(Hsla::from(if self.state.snap_to_grid { BLUE_500 } else { SLATE_700 }))
                                        .text_xs()
                                        .text_color(Hsla::from(WHITE))
                                        .child(if self.state.snap_to_grid { "ON" } else { "OFF" })
                                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                            this.state.toggle_snap_to_grid();
                                            cx.notify();
                                        })),
                                );

                            let conn_row = div()
                                .flex()
                                .items_center()
                                .justify_between()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().text_xs().text_color(Hsla::from(theme.text)).child("Show Group Connection Lines"))
                                .child(
                                    div()
                                        .cursor_pointer()
                                        .px(px(8.0))
                                        .py(px(2.0))
                                        .rounded(px(CORNER_RADIUS_XS))
                                        .bg(Hsla::from(if self.state.show_connections { BLUE_500 } else { SLATE_700 }))
                                        .text_xs()
                                        .text_color(Hsla::from(WHITE))
                                        .child(if self.state.show_connections { "ON" } else { "OFF" })
                                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                            this.state.toggle_connection_lines();
                                            cx.notify();
                                        })),
                                );

                            tab_body = tab_body.child(snap_row).child(conn_row);
                        }
                        "appearance" => {
                            let theme_row = div()
                                .flex()
                                .items_center()
                                .justify_between()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().text_xs().text_color(Hsla::from(theme.text)).child("Color Theme"))
                                .child(
                                    div()
                                        .cursor_pointer()
                                        .px(px(10.0))
                                        .py(px(4.0))
                                        .rounded(px(CORNER_RADIUS_XS))
                                        .bg(Hsla::from(BLUE_500))
                                        .text_xs()
                                        .text_color(Hsla::from(WHITE))
                                        .child(if self.state.theme.is_dark { "Switch to Light Mode" } else { "Switch to Dark Mode" })
                                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                            this.state.toggle_theme();
                                            cx.notify();
                                        })),
                                );
                            tab_body = tab_body.child(theme_row);
                        }
                        "data" => {
                            let db_info = div()
                                .flex()
                                .flex_col()
                                .gap_1()
                                .p_3()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().font_weight(FontWeight::BOLD).text_xs().text_color(Hsla::from(theme.text)).child("Storage Engine: SQLite 3 (WAL Mode)"))
                                .child(div().text_xs().text_color(Hsla::from(theme.text_muted)).child(format!("Total Active Notes: {}", self.state.notes.len())))
                                .child(div().text_xs().text_color(Hsla::from(theme.text_muted)).child("Location: ~/.local/share/DiaryNote/diarynote.db"));
                            tab_body = tab_body.child(db_info);
                        }
                        "ai" => {
                            let ai_cfg = self.state.ai_config.clone();
                            let provider_row = div()
                                .flex()
                                .items_center()
                                .justify_between()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().text_xs().text_color(Hsla::from(theme.text)).child("Active Provider"))
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(Hsla::from(BLUE_500))
                                        .child(ai_cfg.provider.display_name()),
                                );

                            let model_row = div()
                                .flex()
                                .items_center()
                                .justify_between()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().text_xs().text_color(Hsla::from(theme.text)).child("Model"))
                                .child(div().text_xs().font_family(".SystemUIFont").text_color(Hsla::from(theme.text_muted)).child(ai_cfg.model.clone()));

                            let endpoint_row = div()
                                .flex()
                                .flex_col()
                                .gap_1()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().text_xs().text_color(Hsla::from(theme.text)).child("Endpoint URL"))
                                .child(div().text_xs().font_family(".SystemUIFont").text_color(Hsla::from(theme.text_muted)).child(ai_cfg.endpoint.clone()));

                            let zero_emoji_notice = div()
                                .flex()
                                .items_center()
                                .gap_1()
                                .p_2()
                                .rounded(px(CORNER_RADIUS_XS))
                                .bg(Hsla::from(EMERALD_500.with_alpha(0.12)))
                                .border_1()
                                .border_color(Hsla::from(EMERALD_500.with_alpha(0.3)))
                                .child(Icon::new(IconKind::Check).with_size(IconSize::Xs))
                                .child(div().text_xs().text_color(Hsla::from(EMERALD_500)).child("Zero Emojis System Prompt Active"));

                            tab_body = tab_body.child(provider_row).child(model_row).child(endpoint_row).child(zero_emoji_notice);
                        }
                        _ => {
                            let about_info = div()
                                .flex()
                                .flex_col()
                                .gap_2()
                                .p_3()
                                .rounded(px(CORNER_RADIUS_SM))
                                .bg(Hsla::from(theme.sub_surface))
                                .child(div().font_weight(FontWeight::BOLD).text_sm().text_color(Hsla::from(theme.text)).child("DiaryNote Native v0.2.0-beta.3"))
                                .child(div().text_xs().text_color(Hsla::from(theme.text_dim)).child("Pure Rust, GPUI GPU-Accelerated 120 FPS Rendering Engine."))
                                .child(div().text_xs().text_color(Hsla::from(theme.text_muted)).child("Zero webviews, zero tracking, 100% offline-first privacy."));
                            tab_body = tab_body.child(about_info);
                        }
                    }

                    dialog_card = dialog_card.child(tab_body);
                    modal_backdrop = modal_backdrop.child(dialog_card);
                    root = root.child(modal_backdrop);
                }
                ActiveModal::JournalCalendar => {
                    let streak = self.state.get_journal_streak();
                    let daily_dates = self.state.get_daily_entry_dates();

                    let mut modal_backdrop = div()
                        .absolute()
                        .inset_0()
                        .bg(Hsla::from(SLATE_950.with_alpha(0.6)))
                        .flex()
                        .items_start()
                        .justify_center()
                        .pt_20()
                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                            this.state.close_modal();
                            cx.notify();
                        }));

                    let mut dialog_card = div()
                        .w(px(480.0))
                        .flex()
                        .flex_col()
                        .rounded(px(CORNER_RADIUS_SM))
                        .bg(Hsla::from(if theme.is_dark { SLATE_900 } else { WHITE }))
                        .border_1()
                        .border_color(Hsla::from(theme.border))
                        .shadow_xl()
                        .p_5()
                        .gap_3()
                        .on_mouse_down(MouseButton::Left, cx.listener(|_this, _event: &MouseDownEvent, _window, _cx| {}));

                    // Calendar Header
                    let cal_header = div()
                        .flex()
                        .items_center()
                        .justify_between()
                        .border_b_1()
                        .border_color(Hsla::from(theme.border_subtle))
                        .pb_2()
                        .child(
                            div()
                                .flex()
                                .items_center()
                                .gap_2()
                                .child(div().font_weight(FontWeight::BOLD).text_sm().text_color(Hsla::from(theme.text)).child("Daily Journal Calendar"))
                                .child(
                                    div()
                                        .px(px(6.0))
                                        .py(px(2.0))
                                        .rounded_full()
                                        .bg(Hsla::from(AMBER_500.with_alpha(0.2)))
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(Hsla::from(AMBER_500))
                                        .child(format!("★ {}-day streak", streak)),
                                ),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .text_xs()
                                .text_color(Hsla::from(theme.text_muted))
                                .hover(|s| s.text_color(Hsla::from(theme.text)))
                                .child("✕")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.close_modal();
                                    cx.notify();
                                })),
                        );
                    dialog_card = dialog_card.child(cal_header);

                    // Days grid
                    let mut days_list = div().flex().flex_col().gap_1();
                    let today_date = chrono::Local::now().format("%Y-%m-%d").to_string();

                    let today_row = div()
                        .flex()
                        .items_center()
                        .justify_between()
                        .p_2()
                        .rounded(px(CORNER_RADIUS_SM))
                        .bg(Hsla::from(theme.sub_surface))
                        .cursor_pointer()
                        .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_xs()
                                .text_color(Hsla::from(theme.text))
                                .child(format!("Today ({})", today_date)),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(Hsla::from(if daily_dates.contains(&today_date) { EMERALD_500 } else { BLUE_500 }))
                                .child(if daily_dates.contains(&today_date) { "✓ Completed" } else { "+ Write Today's Entry" }),
                        )
                        .on_mouse_down(MouseButton::Left, cx.listener(move |this, _event: &MouseDownEvent, _window, cx| {
                            this.state.open_or_create_daily_entry_for_date(&today_date, 1280.0, 800.0);
                            this.state.close_modal();
                            cx.notify();
                        }));

                    days_list = days_list.child(today_row);

                    dialog_card = dialog_card.child(days_list);
                    modal_backdrop = modal_backdrop.child(dialog_card);
                    root = root.child(modal_backdrop);
                }
                ActiveModal::Shortcuts => {
                    let mut modal_backdrop = div()
                        .absolute()
                        .inset_0()
                        .bg(Hsla::from(SLATE_950.with_alpha(0.6)))
                        .flex()
                        .items_start()
                        .justify_center()
                        .pt_16()
                        .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                            this.state.close_modal();
                            cx.notify();
                        }));

                    let mut dialog_card = div()
                        .w(px(560.0))
                        .max_h(px(520.0))
                        .flex()
                        .flex_col()
                        .rounded(px(CORNER_RADIUS_SM))
                        .bg(Hsla::from(if theme.is_dark { SLATE_900 } else { WHITE }))
                        .border_1()
                        .border_color(Hsla::from(theme.border))
                        .shadow_xl()
                        .p_5()
                        .gap_3()
                        .on_mouse_down(MouseButton::Left, cx.listener(|_this, _event: &MouseDownEvent, _window, _cx| {}));

                    let sc_header = div()
                        .flex()
                        .items_center()
                        .justify_between()
                        .border_b_1()
                        .border_color(Hsla::from(theme.border_subtle))
                        .pb_2()
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_sm()
                                .text_color(Hsla::from(theme.text))
                                .child("Keyboard Shortcuts"),
                        )
                        .child(
                            div()
                                .cursor_pointer()
                                .text_xs()
                                .text_color(Hsla::from(theme.text_muted))
                                .hover(|s| s.text_color(Hsla::from(theme.text)))
                                .child("✕")
                                .on_mouse_down(MouseButton::Left, cx.listener(|this, _event: &MouseDownEvent, _window, cx| {
                                    this.state.close_modal();
                                    cx.notify();
                                })),
                        );
                    dialog_card = dialog_card.child(sc_header);

                    let shortcuts = vec![
                        ("N / Double-Click", "Create new note"),
                        ("Ctrl + Shift + D", "Today's daily journal entry"),
                        ("Ctrl + K", "Universal note search"),
                        ("Ctrl + Z / Y", "Undo / Redo canvas action"),
                        ("Ctrl + B", "Toggle notes sidebar"),
                        ("Ctrl + L", "Lock / unlock selected notes"),
                        ("Ctrl + G / Shift+G", "Group / Ungroup selected notes"),
                        ("Ctrl + X / V", "Cut & relocate notes at cursor"),
                        ("T", "Toggle Light / Dark theme"),
                        ("S", "Toggle Snap to Grid (24px)"),
                        ("C", "Toggle Connection lines"),
                        ("F", "Fit all notes in viewport"),
                        ("Z", "Toggle Zen Mode (hide chrome)"),
                        ("Delete / Backspace", "Delete selected notes"),
                        ("+ / - / 0", "Zoom in / Zoom out / Reset 100%"),
                    ];

                    let mut sc_list = div().flex().flex_col().gap_1().overflow_hidden().flex_1();
                    for (hotkey, label) in shortcuts {
                        let row = div()
                            .flex()
                            .items_center()
                            .justify_between()
                            .py(px(3.0))
                            .px(px(6.0))
                            .rounded(px(CORNER_RADIUS_XS))
                            .hover(|s| s.bg(Hsla::from(theme.sub_surface_hover)))
                            .child(div().text_xs().text_color(Hsla::from(theme.text)).child(label))
                            .child(
                                div()
                                    .px(px(6.0))
                                    .py(px(2.0))
                                    .rounded(px(CORNER_RADIUS_XS))
                                    .bg(Hsla::from(theme.sub_surface))
                                    .border_1()
                                    .border_color(Hsla::from(theme.border_subtle))
                                    .text_xs()
                                    .font_family(".SystemUIFont")
                                    .text_color(Hsla::from(theme.text_muted))
                                    .child(hotkey),
                            );
                        sc_list = sc_list.child(row);
                    }

                    dialog_card = dialog_card.child(sc_list);
                    modal_backdrop = modal_backdrop.child(dialog_card);
                    root = root.child(modal_backdrop);
                }
                _ => {
                    // Fallback to declarative active modal element
                    root = root.child(active_modal.clone());
                }
            }
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
        let mut workspace = WorkspaceView::for_testing();

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
