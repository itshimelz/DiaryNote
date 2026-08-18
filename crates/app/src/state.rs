//! Application state and action dispatching model.
//!
//! Provides a centralized, unidirectional state store managing notes,
//! spatial canvas camera, active selection, undo/redo history, and modals.
//! Strictly zero emojis — uses clean monochromatic iconography.

use domain::models::note::{ColorTheme, Mood, Note, NoteId, Point2D, Size2D};
use domain::spatial::camera::CanvasCamera;
use domain::spatial::history::{CanvasAction, HistoryStack};
use storage::repositories::sqlite_notes::SqliteNotesRepository;
use ui::tokens::paper_themes::PaperThemeKind;
use ui::tokens::surfaces::SurfaceTheme;
use ui::views::modals_view::ActiveModal;

/// Global Application State
#[allow(dead_code)]
pub struct AppState {
    /// In-memory active notes map/list
    pub notes: Vec<Note>,
    /// Canvas spatial camera (pan X/Y, zoom)
    pub camera: CanvasCamera,
    /// Currently selected note IDs
    pub selected_note_ids: Vec<NoteId>,
    /// Note IDs currently staged for relocation (Cut state)
    pub cut_note_ids: Vec<NoteId>,
    /// Note currently being edited (if any)
    pub editing_note_id: Option<NoteId>,
    /// Active rubber-band selection marquee (if dragging)
    pub marquee: Option<ui::views::canvas_view::MarqueeBox>,
    /// Dragging state for notes
    pub dragging_notes: Option<Point2D>,
    /// Active modal window (if any)
    pub active_modal: Option<ActiveModal>,
    /// Sidebar drawer visibility
    pub is_sidebar_open: bool,
    /// Sidebar search filter
    pub search_query: String,
    /// Action history for undo/redo
    pub history: HistoryStack,
    /// Dark/Light surface theme
    pub theme: SurfaceTheme,
    /// Snap to 24px grid flag
    pub snap_to_grid: bool,
    /// Show reference connection lines flag
    pub show_connections: bool,
    /// Zen Mode flag (hides bottom dock and chrome)
    pub is_zen_mode: bool,
    /// SQLite storage repository
    pub repository: Option<SqliteNotesRepository>,
    /// Status message
    pub status_message: String,
    /// Is saving indicator
    pub is_saving: bool,
}

#[allow(dead_code)]
impl AppState {
    pub fn new() -> Self {
        let mut state = Self {
            notes: Vec::new(),
            camera: CanvasCamera::new(0.0, 0.0, 1.0),
            selected_note_ids: Vec::new(),
            cut_note_ids: Vec::new(),
            editing_note_id: None,
            marquee: None,
            dragging_notes: None,
            active_modal: None,
            is_sidebar_open: false,
            search_query: String::new(),
            history: HistoryStack::new(50),
            theme: SurfaceTheme::dark(),
            snap_to_grid: false,
            show_connections: true,
            is_zen_mode: false,
            repository: None,
            status_message: "Ready".into(),
            is_saving: false,
        };

        // Initialize sample notes if empty (strictly zero emojis)
        state.populate_defaults();
        state
    }

    /// Initialize sample welcome cards if starting fresh (strictly zero emojis)
    pub fn populate_defaults(&mut self) {
        if self.notes.is_empty() {
            let mut note1 = Note::new(
                "Welcome to DiaryNote Native",
                "DiaryNote is now powered by pure Rust and GPUI.\n\n- GPU-Accelerated 120 FPS Rendering\n- AES-256-GCM Envelope Encryption\n- Infinite 2D Spatial Canvas\n- Native SQLite 3 WAL Persistence",
                Point2D::new(100.0, 100.0),
            );
            note1.color_theme = ColorTheme::Slate;

            let mut note2 = Note::new(
                "Quick Tips & Shortcuts",
                "Here are some helpful keyboard shortcuts:\n\n- Double-click anywhere to create a new note\n- Space + Drag or Middle-click to pan\n- Ctrl + Scroll to zoom in and out\n- Ctrl + K for universal search\n- Ctrl + B to toggle notes drawer\n- T to toggle Light / Dark theme\n- Ctrl + / for full shortcuts cheatsheet",
                Point2D::new(460.0, 100.0),
            );
            note2.color_theme = ColorTheme::Amber;

            let mut note3 = Note::new(
                "Tasks & Checklist",
                "- [x] Migrate to Pure Rust & GPUI\n- [x] Integrate SQLite 3 WAL engine\n- [ ] Create your first daily note\n- [ ] Customize paper themes",
                Point2D::new(100.0, 360.0),
            );
            note3.color_theme = ColorTheme::Emerald;

            self.notes.push(note1);
            self.notes.push(note2);
            self.notes.push(note3);
        }
    }

    /// Toggle Dark and Light surface theme
    pub fn toggle_theme(&mut self) {
        self.theme = if self.theme.is_dark {
            SurfaceTheme::light()
        } else {
            SurfaceTheme::dark()
        };
        self.status_message = format!(
            "Switched to {} theme",
            if self.theme.is_dark {
                "Dark"
            } else {
                "Light"
            }
        );
    }

    /// Set theme directly
    pub fn set_theme(&mut self, is_dark: bool) {
        self.theme = if is_dark {
            SurfaceTheme::dark()
        } else {
            SurfaceTheme::light()
        };
    }

    /// Add a new note at canvas coordinates
    pub fn create_note(
        &mut self,
        title: impl Into<String>,
        body: impl Into<String>,
        position: Point2D,
    ) -> NoteId {
        let note = Note::new(title, body, position);
        let id = note.id;
        self.history
            .push(CanvasAction::CreateNote(Box::new(note.clone())));
        self.notes.push(note);
        self.selected_note_ids = vec![id];
        self.editing_note_id = Some(id);
        self.status_message = "Note created".into();
        id
    }

    /// Create new note at the current camera viewport center
    pub fn create_note_at_center(&mut self, viewport_width: f32, viewport_height: f32) -> NoteId {
        let center_screen = Point2D::new(viewport_width / 2.0, viewport_height / 2.0);
        let center_canvas = self.camera.screen_to_canvas(center_screen);
        let note_pos = Point2D::new(
            center_canvas.x - Size2D::DEFAULT_NOTE.width / 2.0,
            center_canvas.y - Size2D::DEFAULT_NOTE.height / 2.0,
        );
        self.create_note("Untitled Note", "", note_pos)
    }

    /// Open or create today's daily journal entry
    pub fn create_daily_journal_entry(&mut self, viewport_width: f32, viewport_height: f32) -> NoteId {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let title = format!("Daily Entry — {}", today);

        // Check if an entry for today already exists
        if let Some(existing) = self.notes.iter().find(|n| n.entry_date.as_deref() == Some(&today)) {
            let id = existing.id;
            self.selected_note_ids = vec![id];
            self.editing_note_id = Some(id);
            self.status_message = format!("Opened existing entry for {}", today);
            return id;
        }

        let center_screen = Point2D::new(viewport_width / 2.0, viewport_height / 2.0);
        let center_canvas = self.camera.screen_to_canvas(center_screen);
        let note_pos = Point2D::new(
            center_canvas.x - Size2D::DEFAULT_NOTE.width / 2.0,
            center_canvas.y - Size2D::DEFAULT_NOTE.height / 2.0,
        );

        let mut note = Note::new(title, "Reflections, tasks, and notes for today:\n\n- [ ] ", note_pos);
        note.is_daily_entry = true;
        note.entry_date = Some(today.clone());
        note.mood = Mood::Good;
        note.color_theme = ColorTheme::Sky;

        let id = note.id;
        self.history
            .push(CanvasAction::CreateNote(Box::new(note.clone())));
        self.notes.push(note);
        self.selected_note_ids = vec![id];
        self.editing_note_id = Some(id);
        self.status_message = format!("Created journal entry for {}", today);
        id
    }

    /// Select a single note (or toggle selection if multi-select)
    pub fn select_note(&mut self, id: NoteId, multi_select: bool) {
        if multi_select {
            if let Some(pos) = self.selected_note_ids.iter().position(|&x| x == id) {
                self.selected_note_ids.remove(pos);
            } else {
                self.selected_note_ids.push(id);
            }
        } else {
            self.selected_note_ids = vec![id];
        }
    }

    /// Select all notes on the canvas
    pub fn select_all(&mut self) {
        self.selected_note_ids = self.notes.iter().map(|n| n.id).collect();
        self.status_message = format!("Selected all {} notes", self.notes.len());
    }

    /// Deselect all notes
    pub fn clear_selection(&mut self) {
        self.selected_note_ids.clear();
        self.cut_note_ids.clear();
        self.editing_note_id = None;
    }

    /// Delete currently selected notes
    pub fn delete_selected_notes(&mut self) {
        if self.selected_note_ids.is_empty() {
            return;
        }

        let selected = self.selected_note_ids.clone();
        for id in &selected {
            if let Some(note) = self.notes.iter().find(|n| n.id == *id) {
                self.history
                    .push(CanvasAction::DeleteNote(Box::new(note.clone())));
            }
        }

        self.notes.retain(|n| !selected.contains(&n.id));
        self.selected_note_ids.clear();
        self.editing_note_id = None;
        self.status_message = format!("Deleted {} note(s)", selected.len());
    }

    /// Duplicate selected notes with offset
    pub fn duplicate_selected_notes(&mut self) {
        let mut new_notes = Vec::new();
        let mut new_ids = Vec::new();

        for id in &self.selected_note_ids {
            if let Some(note) = self.notes.iter().find(|n| n.id == *id) {
                let dup = note.clone_as_duplicate(30.0, 30.0);
                self.history
                    .push(CanvasAction::CreateNote(Box::new(dup.clone())));
                new_ids.push(dup.id);
                new_notes.push(dup);
            }
        }

        self.notes.extend(new_notes);
        self.selected_note_ids = new_ids;
        self.status_message = "Notes duplicated".into();
    }

    /// Cut selected notes for long-distance relocation
    pub fn cut_selected_notes(&mut self) {
        if self.selected_note_ids.is_empty() {
            return;
        }
        self.cut_note_ids = self.selected_note_ids.clone();
        self.status_message = format!(
            "{} note(s) cut. Press Ctrl+Shift+V or Ctrl+V to place. [Esc to cancel]",
            self.cut_note_ids.len()
        );
    }

    /// Relocate cut notes to target canvas position
    pub fn paste_relocate_notes(&mut self, target: Point2D) {
        if self.cut_note_ids.is_empty() {
            return;
        }

        let count = self.cut_note_ids.len();
        let mut offset_x = 0.0f32;
        let mut offset_y = 0.0f32;

        for id in &self.cut_note_ids {
            if let Some(note) = self.notes.iter_mut().find(|n| n.id == *id) {
                let old_pos = note.position;
                let new_pos = Point2D::new(target.x + offset_x, target.y + offset_y);
                note.position = new_pos;
                note.touch();
                self.history.push(CanvasAction::MoveNote {
                    note_id: *id,
                    from: old_pos,
                    to: new_pos,
                });
                offset_x += 30.0;
                offset_y += 30.0;
            }
        }

        self.selected_note_ids = self.cut_note_ids.clone();
        self.cut_note_ids.clear();
        self.status_message = format!("Relocated {} note(s)", count);
    }

    /// Undo last canvas action
    pub fn undo(&mut self) {
        if let Some(action) = self.history.undo() {
            match action {
                CanvasAction::CreateNote(note) => {
                    self.notes.retain(|n| n.id != note.id);
                    self.status_message = "Undo: Note removed".into();
                }
                CanvasAction::DeleteNote(note) => {
                    self.notes.push(*note);
                    self.status_message = "Undo: Note restored".into();
                }
                CanvasAction::MoveNote { note_id, from, .. } => {
                    if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
                        note.position = from;
                        note.touch();
                    }
                    self.status_message = "Undo: Move reverted".into();
                }
                CanvasAction::UpdateNote { before, .. } => {
                    if let Some(note) = self.notes.iter_mut().find(|n| n.id == before.id) {
                        *note = *before;
                        note.touch();
                    }
                    self.status_message = "Undo: Note update reverted".into();
                }
            }
        } else {
            self.status_message = "Nothing to undo".into();
        }
    }

    /// Redo last canvas action
    pub fn redo(&mut self) {
        if let Some(action) = self.history.redo() {
            match action {
                CanvasAction::CreateNote(note) => {
                    self.notes.push(*note);
                    self.status_message = "Redo: Note re-created".into();
                }
                CanvasAction::DeleteNote(note) => {
                    self.notes.retain(|n| n.id != note.id);
                    self.status_message = "Redo: Note re-deleted".into();
                }
                CanvasAction::MoveNote { note_id, to, .. } => {
                    if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
                        note.position = to;
                        note.touch();
                    }
                    self.status_message = "Redo: Note re-moved".into();
                }
                CanvasAction::UpdateNote { after, .. } => {
                    if let Some(note) = self.notes.iter_mut().find(|n| n.id == after.id) {
                        *note = *after;
                        note.touch();
                    }
                    self.status_message = "Redo: Note update re-applied".into();
                }
            }
        } else {
            self.status_message = "Nothing to redo".into();
        }
    }

    /// Apply paper theme to selected notes
    pub fn set_selected_paper_theme(&mut self, theme: PaperThemeKind) {
        let color_theme = ColorTheme::from_name(theme.as_str());
        for note in &mut self.notes {
            if self.selected_note_ids.contains(&note.id) {
                note.color_theme = color_theme;
                note.touch();
            }
        }
        self.status_message = format!("Set theme to {}", theme.label());
    }

    /// Pan the camera by delta screen pixels
    pub fn pan(&mut self, delta_x: f32, delta_y: f32) {
        self.camera.pan_x += delta_x;
        self.camera.pan_y += delta_y;
    }

    /// Zoom centered on screen coordinates
    pub fn zoom_at(&mut self, new_zoom: f32, cursor_x: f32, cursor_y: f32) {
        self.camera
            .zoom_at(Point2D::new(cursor_x, cursor_y), new_zoom);
    }

    /// Reset camera to origin (100% zoom)
    pub fn reset_camera(&mut self) {
        self.camera = CanvasCamera::reset();
        self.status_message = "Canvas reset to 100%".into();
    }

    /// Focus camera on selected note
    pub fn focus_selected_note(&mut self, viewport_width: f32, viewport_height: f32) {
        if let Some(&first_id) = self.selected_note_ids.first() {
            if let Some(note) = self.notes.iter().find(|n| n.id == first_id) {
                let note_center_x = note.position.x + note.size.width / 2.0;
                let note_center_y = note.position.y + note.size.height / 2.0;

                self.camera.zoom = 1.0;
                self.camera.pan_x = (viewport_width / 2.0) - note_center_x;
                self.camera.pan_y = (viewport_height / 2.0) - note_center_y;
                self.status_message = format!("Focused on \"{}\"", note.title);
            }
        }
    }

    /// Fit all notes in viewport
    pub fn fit_all_notes(&mut self, viewport_width: f32, viewport_height: f32) {
        if self.notes.is_empty() {
            return;
        }

        let mut min_x = f32::MAX;
        let mut min_y = f32::MAX;
        let mut max_x = f32::MIN;
        let mut max_y = f32::MIN;

        for note in &self.notes {
            min_x = min_x.min(note.position.x);
            min_y = min_y.min(note.position.y);
            max_x = max_x.max(note.position.x + note.size.width);
            max_y = max_y.max(note.position.y + note.size.height);
        }

        let content_width = (max_x - min_x).max(100.0);
        let content_height = (max_y - min_y).max(100.0);

        let pad = 60.0f32;
        let scale_x = (viewport_width - pad * 2.0) / content_width;
        let scale_y = (viewport_height - pad * 2.0) / content_height;
        let new_zoom = scale_x.min(scale_y).clamp(0.2, 1.5);

        let center_x = (min_x + max_x) / 2.0;
        let center_y = (min_y + max_y) / 2.0;

        self.camera.zoom = new_zoom;
        self.camera.pan_x = (viewport_width / 2.0) - (center_x * new_zoom);
        self.camera.pan_y = (viewport_height / 2.0) - (center_y * new_zoom);
        self.status_message = "Fitted all notes in view".into();
    }

    /// Toggle pin state on selected notes
    pub fn toggle_pin_selected(&mut self) {
        for note in &mut self.notes {
            if self.selected_note_ids.contains(&note.id) {
                note.is_pinned = !note.is_pinned;
                note.touch();
            }
        }
    }

    /// Toggle favorite state on selected notes
    pub fn toggle_favorite_selected(&mut self) {
        for note in &mut self.notes {
            if self.selected_note_ids.contains(&note.id) {
                note.is_favorite = !note.is_favorite;
                note.touch();
            }
        }
    }

    /// Toggle lock state on selected notes
    pub fn toggle_lock_selected(&mut self) {
        for note in &mut self.notes {
            if self.selected_note_ids.contains(&note.id) {
                note.is_locked = !note.is_locked;
                note.touch();
            }
        }
        self.status_message = "Toggled lock on selected notes".into();
    }

    /// Toggle Zen mode
    pub fn toggle_zen_mode(&mut self) {
        self.is_zen_mode = !self.is_zen_mode;
        self.status_message = if self.is_zen_mode {
            "Zen Mode Enabled (Press Z to exit)".into()
        } else {
            "Zen Mode Disabled".into()
        };
    }

    /// Toggle snap to grid
    pub fn toggle_snap_to_grid(&mut self) {
        self.snap_to_grid = !self.snap_to_grid;
        self.status_message = if self.snap_to_grid {
            "Snap to Grid: On (24px)".into()
        } else {
            "Snap to Grid: Off".into()
        };
    }

    /// Toggle connection lines
    pub fn toggle_connection_lines(&mut self) {
        self.show_connections = !self.show_connections;
        self.status_message = if self.show_connections {
            "Connection lines: Visible".into()
        } else {
            "Connection lines: Hidden".into()
        };
    }

    /// Open modal
    pub fn open_modal(&mut self, modal: ActiveModal) {
        self.active_modal = Some(modal);
    }

    /// Close current modal
    pub fn close_modal(&mut self) {
        self.active_modal = None;
    }

    /// Toggle notes sidebar
    pub fn toggle_sidebar(&mut self) {
        self.is_sidebar_open = !self.is_sidebar_open;
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_crud() {
        let mut state = AppState::new();
        assert_eq!(state.notes.len(), 3);

        let new_id = state.create_note("Test", "Body", Point2D::new(0.0, 0.0));
        assert_eq!(state.notes.len(), 4);
        assert_eq!(state.selected_note_ids, vec![new_id]);

        state.duplicate_selected_notes();
        assert_eq!(state.notes.len(), 5);

        state.delete_selected_notes();
        assert_eq!(state.notes.len(), 4);
    }

    #[test]
    fn test_app_state_undo_redo() {
        let mut state = AppState::new();
        let initial_len = state.notes.len();

        let _ = state.create_note("New Note", "Content", Point2D::new(10.0, 10.0));
        assert_eq!(state.notes.len(), initial_len + 1);

        state.undo();
        assert_eq!(state.notes.len(), initial_len);

        state.redo();
        assert_eq!(state.notes.len(), initial_len + 1);
    }

    #[test]
    fn test_app_state_theme_toggle() {
        let mut state = AppState::new();
        assert!(state.theme.is_dark);

        state.toggle_theme();
        assert!(!state.theme.is_dark);

        state.toggle_theme();
        assert!(state.theme.is_dark);
    }

    #[test]
    fn test_app_state_cut_and_relocate() {
        let mut state = AppState::new();
        let note_id = state.notes[0].id;
        state.select_note(note_id, false);

        state.cut_selected_notes();
        assert_eq!(state.cut_note_ids, vec![note_id]);

        state.paste_relocate_notes(Point2D::new(500.0, 500.0));
        assert!(state.cut_note_ids.is_empty());
        assert_eq!(state.notes[0].position, Point2D::new(500.0, 500.0));
    }

    #[test]
    fn test_app_state_camera_and_focus() {
        let mut state = AppState::new();
        state.pan(50.0, 100.0);
        assert_eq!(state.camera.pan_x, 50.0);
        assert_eq!(state.camera.pan_y, 100.0);

        state.reset_camera();
        assert_eq!(state.camera.pan_x, 0.0);
        assert_eq!(state.camera.pan_y, 0.0);

        let note_id = state.notes[0].id;
        state.select_note(note_id, false);
        state.focus_selected_note(1000.0, 800.0);
        assert_eq!(state.camera.zoom, 1.0);
    }
}
