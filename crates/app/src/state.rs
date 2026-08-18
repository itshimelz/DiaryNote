//! Application state and action dispatching model.
//!
//! Provides a centralized, unidirectional state store managing notes,
//! spatial canvas camera, active selection, undo/redo history, and modals.

use domain::models::note::{ColorTheme, Note, NoteId, Point2D};
use domain::spatial::camera::CanvasCamera;
use domain::spatial::history::HistoryStack;
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
            editing_note_id: None,
            marquee: None,
            dragging_notes: None,
            active_modal: None,
            is_sidebar_open: false,
            search_query: String::new(),
            history: HistoryStack::new(50),
            theme: SurfaceTheme::dark(),
            repository: None,
            status_message: "Ready".into(),
            is_saving: false,
        };

        // Initialize sample notes if empty
        state.populate_defaults();
        state
    }

    /// Initialize sample welcome cards if starting fresh
    pub fn populate_defaults(&mut self) {
        if self.notes.is_empty() {
            let mut note1 = Note::new(
                "Welcome to DiaryNote Native",
                "DiaryNote is now powered by pure Rust and GPUI.\n\n- 🚀 GPU-Accelerated 120 FPS Rendering\n- 🔒 AES-256-GCM Envelope Encryption\n- 📐 Infinite 2D Spatial Canvas\n- 💾 Native SQLite 3 WAL Persistence",
                Point2D::new(100.0, 100.0),
            );
            note1.color_theme = ColorTheme::Slate;

            let mut note2 = Note::new(
                "Quick Tips & Gestures",
                "Here are some helpful shortcuts:\n\n- Double-click anywhere to create a new note\n- Space + Drag or Middle-click to pan\n- Ctrl + Scroll to zoom in and out\n- Ctrl + K for universal search\n- Ctrl + B to toggle notes drawer",
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

    /// Add a new note at canvas coordinates
    pub fn create_note(
        &mut self,
        title: impl Into<String>,
        body: impl Into<String>,
        position: Point2D,
    ) -> NoteId {
        let note = Note::new(title, body, position);
        let id = note.id;
        self.notes.push(note);
        self.selected_note_ids = vec![id];
        self.editing_note_id = Some(id);
        self.status_message = "Note created".into();
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

    /// Deselect all notes
    pub fn clear_selection(&mut self) {
        self.selected_note_ids.clear();
        self.editing_note_id = None;
    }

    /// Delete currently selected notes
    pub fn delete_selected_notes(&mut self) {
        if self.selected_note_ids.is_empty() {
            return;
        }

        let selected = self.selected_note_ids.clone();
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
                new_ids.push(dup.id);
                new_notes.push(dup);
            }
        }

        self.notes.extend(new_notes);
        self.selected_note_ids = new_ids;
        self.status_message = "Notes duplicated".into();
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

    /// Reset camera to origin
    pub fn reset_camera(&mut self) {
        self.camera = CanvasCamera::reset();
        self.status_message = "Canvas reset to 100%".into();
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
    fn test_app_state_camera() {
        let mut state = AppState::new();
        assert_eq!(state.camera.zoom, 1.0);

        state.pan(50.0, 100.0);
        assert_eq!(state.camera.pan_x, 50.0);
        assert_eq!(state.camera.pan_y, 100.0);

        state.reset_camera();
        assert_eq!(state.camera.pan_x, 0.0);
        assert_eq!(state.camera.pan_y, 0.0);
    }

    #[test]
    fn test_app_state_theme_and_modals() {
        let mut state = AppState::new();
        let note_id = state.notes[0].id;
        state.select_note(note_id, false);

        state.set_selected_paper_theme(PaperThemeKind::Cream);
        assert_eq!(state.notes[0].color_theme, ColorTheme::Default);

        state.open_modal(ActiveModal::AISettings);
        assert!(state.active_modal.is_some());
        assert_eq!(state.active_modal, Some(ActiveModal::AISettings));

        state.close_modal();
        assert!(state.active_modal.is_none());
    }

    #[test]
    fn test_app_state_pin_favorite_and_sidebar() {
        let mut state = AppState::new();
        let note_id = state.notes[0].id;
        state.select_note(note_id, false);

        assert!(!state.notes[0].is_pinned);
        state.toggle_pin_selected();
        assert!(state.notes[0].is_pinned);

        assert!(!state.notes[0].is_favorite);
        state.toggle_favorite_selected();
        assert!(state.notes[0].is_favorite);

        assert!(!state.is_sidebar_open);
        state.toggle_sidebar();
        assert!(state.is_sidebar_open);
    }
}
