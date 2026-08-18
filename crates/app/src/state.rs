//! Application state and action dispatching model.
//!
//! Provides a centralized, unidirectional state store managing notes,
//! spatial canvas camera, active selection, undo/redo history, and modals.
//! Strictly zero emojis — uses clean monochromatic iconography.

use ai::provider::AiConfig;
use domain::models::note::{ColorTheme, Mood, Note, NoteId, Point2D, Size2D};
use domain::spatial::camera::CanvasCamera;
use domain::spatial::history::{CanvasAction, HistoryStack};
use std::collections::HashSet;
use storage::repositories::sqlite_notes::SqliteNotesRepository;
use storage::search::SearchResultItem;
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
    /// Set of note IDs with unsaved changes
    pub dirty_note_ids: HashSet<NoteId>,
    /// Timestamp of last successful background write
    pub last_saved_at: Option<chrono::DateTime<chrono::Utc>>,
    /// Last encountered persistence error
    pub save_error: Option<String>,
    /// AI configuration for completions and synthesis
    pub ai_config: AiConfig,
    /// FTS5 full-text search results
    pub fts_results: Vec<SearchResultItem>,
    /// AI streaming / synthesis in progress
    pub is_ai_generating: bool,
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
            dirty_note_ids: HashSet::new(),
            last_saved_at: None,
            save_error: None,
            ai_config: AiConfig::default(),
            fts_results: Vec::new(),
            is_ai_generating: false,
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
        self.status_message = format!("Selected all {} notes", self.selected_note_ids.len());
    }

    /// Alias for select_all
    pub fn select_all_notes(&mut self) {
        self.select_all();
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
                CanvasAction::BatchUpdate { before, .. } => {
                    for note_before in before {
                        if let Some(n) = self.notes.iter_mut().find(|n| n.id == note_before.id) {
                            *n = note_before;
                        }
                    }
                    self.status_message = "Undo: Batch update reverted".into();
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
                CanvasAction::BatchUpdate { after, .. } => {
                    for note_after in after {
                        if let Some(n) = self.notes.iter_mut().find(|n| n.id == note_after.id) {
                            *n = note_after;
                        }
                    }
                    self.status_message = "Redo: Batch update re-applied".into();
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

    /// Toggle pin state on a specific note
    pub fn toggle_pin_note(&mut self, id: NoteId) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == id) {
            note.is_pinned = !note.is_pinned;
            note.touch();
            self.status_message = if note.is_pinned { "Note pinned" } else { "Note unpinned" }.into();
        }
    }

    /// Toggle favorite state on a specific note
    pub fn toggle_favorite_note(&mut self, id: NoteId) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == id) {
            note.is_favorite = !note.is_favorite;
            note.touch();
            self.status_message = if note.is_favorite { "Note starred" } else { "Note unstarred" }.into();
        }
    }

    /// Toggle lock state on a specific note
    pub fn toggle_lock_note(&mut self, id: NoteId) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == id) {
            note.is_locked = !note.is_locked;
            note.touch();
            self.status_message = if note.is_locked { "Note locked" } else { "Note unlocked" }.into();
        }
    }

    /// Delete a single note
    pub fn delete_note(&mut self, id: NoteId) {
        if let Some(pos) = self.notes.iter().position(|n| n.id == id) {
            let note = self.notes.remove(pos);
            self.history.push(CanvasAction::DeleteNote(Box::new(note)));
            self.selected_note_ids.retain(|&x| x != id);
            self.status_message = "Note deleted".into();
        }
    }

    /// Duplicate a single note
    pub fn duplicate_note(&mut self, id: NoteId) {
        if let Some(note) = self.notes.iter().find(|n| n.id == id) {
            let dup = note.clone_as_duplicate(30.0, 30.0);
            let dup_id = dup.id;
            self.history.push(CanvasAction::CreateNote(Box::new(dup.clone())));
            self.notes.push(dup);
            self.selected_note_ids = vec![dup_id];
            self.status_message = "Note duplicated".into();
        }
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

    /// Toggle a checklist item [ ] <-> [x] by index in note body
    pub fn toggle_checklist_item(&mut self, note_id: NoteId, target_index: usize) -> bool {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let before = note.clone();
            let mut current_idx = 0usize;
            let mut new_lines = Vec::new();
            let mut changed = false;

            for line in note.body.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("- [ ] ") || trimmed.starts_with("[ ] ") {
                    if current_idx == target_index {
                        if line.contains("- [ ] ") {
                            new_lines.push(line.replacen("- [ ] ", "- [x] ", 1));
                        } else {
                            new_lines.push(line.replacen("[ ] ", "[x] ", 1));
                        }
                        changed = true;
                    } else {
                        new_lines.push(line.to_string());
                    }
                    current_idx += 1;
                } else if trimmed.starts_with("- [x] ") || trimmed.starts_with("[x] ") {
                    if current_idx == target_index {
                        if line.contains("- [x] ") {
                            new_lines.push(line.replacen("- [x] ", "- [ ] ", 1));
                        } else {
                            new_lines.push(line.replacen("[x] ", "[ ] ", 1));
                        }
                        changed = true;
                    } else {
                        new_lines.push(line.to_string());
                    }
                    current_idx += 1;
                } else {
                    new_lines.push(line.to_string());
                }
            }

            if changed {
                note.body = new_lines.join("\n");
                note.touch();
                let after = note.clone();
                self.history.push(CanvasAction::UpdateNote {
                    before: Box::new(before),
                    after: Box::new(after),
                });
                self.status_message = "Checklist updated".into();
                return true;
            }
        }
        false
    }

    /// Cycle through moods for a note
    pub fn cycle_mood(&mut self, note_id: NoteId) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let before = note.clone();
            note.mood = match note.mood {
                Mood::None => Mood::Great,
                Mood::Great => Mood::Good,
                Mood::Good => Mood::Neutral,
                Mood::Neutral => Mood::Bad,
                Mood::Bad => Mood::Terrible,
                Mood::Terrible => Mood::None,
            };
            note.touch();
            let after = note.clone();
            self.history.push(CanvasAction::UpdateNote {
                before: Box::new(before),
                after: Box::new(after),
            });
            self.status_message = format!("Mood updated to {:?}", note.mood);
        }
    }

    /// Move specified notes by canvas coordinate delta
    pub fn move_notes_by(&mut self, note_ids: &[NoteId], delta_canvas_x: f32, delta_canvas_y: f32) {
        for id in note_ids {
            if let Some(note) = self.notes.iter_mut().find(|n| n.id == *id) {
                let mut new_x = note.position.x + delta_canvas_x;
                let mut new_y = note.position.y + delta_canvas_y;
                if self.snap_to_grid {
                    new_x = (new_x / 24.0).round() * 24.0;
                    new_y = (new_y / 24.0).round() * 24.0;
                }
                note.position = Point2D::new(new_x, new_y);
                note.touch();
            }
        }
    }

    /// Commit notes movement into history stack for undo/redo
    pub fn commit_notes_movement(&mut self, initial_positions: &[(NoteId, Point2D)]) {
        for (id, initial_pos) in initial_positions {
            if let Some(note) = self.notes.iter().find(|n| n.id == *id) {
                if note.position != *initial_pos {
                    self.history.push(CanvasAction::MoveNote {
                        note_id: *id,
                        from: *initial_pos,
                        to: note.position,
                    });
                }
            }
        }
        self.status_message = "Notes moved".into();
    }

    /// Select all notes enclosed or intersecting with the 2D bounding box
    pub fn select_notes_in_box(&mut self, start_canvas: Point2D, end_canvas: Point2D) {
        let min_x = start_canvas.x.min(end_canvas.x);
        let max_x = start_canvas.x.max(end_canvas.x);
        let min_y = start_canvas.y.min(end_canvas.y);
        let max_y = start_canvas.y.max(end_canvas.y);

        let mut selected = Vec::new();
        for note in &self.notes {
            let note_r = note.position.x + note.size.width;
            let note_b = note.position.y + note.size.height;
            if note.position.x <= max_x && note_r >= min_x && note.position.y <= max_y && note_b >= min_y {
                selected.push(note.id);
            }
        }

        self.selected_note_ids = selected;
        self.status_message = format!("Selected {} note(s)", self.selected_note_ids.len());
    }

    /// Aligns all currently selected notes to the top Y
    pub fn align_selected_notes_top(&mut self) {
        if self.selected_note_ids.len() < 2 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::align_top(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Aligned selected notes to top".into();
    }

    /// Aligns all currently selected notes to the left X
    pub fn align_selected_notes_left(&mut self) {
        if self.selected_note_ids.len() < 2 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::align_left(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Aligned selected notes to left".into();
    }

    /// Aligns all currently selected notes to horizontal center
    pub fn align_selected_notes_center_h(&mut self) {
        if self.selected_note_ids.len() < 2 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::align_center_horizontal(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Aligned selected notes to center".into();
    }

    /// Aligns all currently selected notes to bottom edge
    pub fn align_selected_notes_bottom(&mut self) {
        if self.selected_note_ids.len() < 2 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::align_bottom(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Aligned selected notes to bottom".into();
    }

    /// Distributes selected notes evenly horizontally
    pub fn distribute_selected_notes_h(&mut self) {
        if self.selected_note_ids.len() < 3 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::distribute_horizontally(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Distributed selected notes horizontally".into();
    }

    /// Distributes selected notes evenly vertically
    pub fn distribute_selected_notes_v(&mut self) {
        if self.selected_note_ids.len() < 3 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::distribute_vertically(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Distributed selected notes vertically".into();
    }

    /// Arranges selected notes in a neat 2D matrix
    pub fn pack_selected_notes_grid(&mut self) {
        if self.selected_note_ids.len() < 2 {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        
        let mut target_notes: Vec<Note> = initial_notes.clone();
        domain::spatial::layout::arrange_in_grid(&mut target_notes);

        for target in &target_notes {
            if let Some(n) = self.notes.iter_mut().find(|n| n.id == target.id) {
                n.position = target.position;
                n.touch();
            }
        }

        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: target_notes,
        });
        self.status_message = "Arranged selected notes in grid".into();
    }

    /// Resize a note card
    pub fn resize_note(&mut self, note_id: NoteId, width: f32, height: f32) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let mut final_w = width.max(240.0);
            let mut final_h = height.max(160.0);
            if self.snap_to_grid {
                final_w = (final_w / 24.0).round() * 24.0;
                final_h = (final_h / 24.0).round() * 24.0;
            }
            let initial = note.clone();
            note.size = Size2D::new_unchecked(final_w, final_h);
            note.touch();
            self.history.push(CanvasAction::UpdateNote {
                before: Box::new(initial),
                after: Box::new(note.clone()),
            });
        }
    }

    /// Set theme for a single note
    pub fn set_note_theme(&mut self, note_id: NoteId, theme: ColorTheme) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let initial = note.clone();
            note.color_theme = theme;
            note.touch();
            self.history.push(CanvasAction::UpdateNote {
                before: Box::new(initial),
                after: Box::new(note.clone()),
            });
        }
    }

    /// Set color theme for all selected notes
    pub fn set_selected_notes_theme(&mut self, theme: ColorTheme) {
        if self.selected_note_ids.is_empty() {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();

        for note in self.notes.iter_mut() {
            if sel_ids.contains(&note.id) {
                note.color_theme = theme;
                note.touch();
            }
        }

        let after_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: after_notes,
        });
        self.status_message = format!("Updated color theme for {} notes", sel_ids.len());
    }

    /// Set font style for a single note
    pub fn set_note_font(&mut self, note_id: NoteId, font: impl Into<String>) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let initial = note.clone();
            note.font_family = domain::models::note::FontFamily::from_str_name(&font.into());
            note.touch();
            self.history.push(CanvasAction::UpdateNote {
                before: Box::new(initial),
                after: Box::new(note.clone()),
            });
        }
    }

    /// Group all currently selected notes
    pub fn group_selected_notes(&mut self) {
        if self.selected_note_ids.len() < 2 {
            return;
        }
        let group_id = NoteId::new().0.to_string();
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();

        for note in self.notes.iter_mut() {
            if sel_ids.contains(&note.id) {
                note.group_id = Some(group_id.clone());
                note.touch();
            }
        }

        let after_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: after_notes,
        });
        self.status_message = format!("Grouped {} notes", sel_ids.len());
    }

    /// Ungroup all currently selected notes
    pub fn ungroup_selected_notes(&mut self) {
        if self.selected_note_ids.is_empty() {
            return;
        }
        let sel_ids = self.selected_note_ids.clone();
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();

        for note in self.notes.iter_mut() {
            if sel_ids.contains(&note.id) {
                note.group_id = None;
                note.touch();
            }
        }

        let after_notes: Vec<Note> = self.notes.iter().filter(|n| sel_ids.contains(&n.id)).cloned().collect();
        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: after_notes,
        });
        self.status_message = "Ungrouped notes".into();
    }

    /// Ungroup a specific group ID
    pub fn ungroup_group(&mut self, group_id: &str) {
        let initial_notes: Vec<Note> = self.notes.iter().filter(|n| n.group_id.as_deref() == Some(group_id)).cloned().collect();
        if initial_notes.is_empty() {
            return;
        }

        for note in self.notes.iter_mut() {
            if note.group_id.as_deref() == Some(group_id) {
                note.group_id = None;
                note.touch();
            }
        }

        let after_notes: Vec<Note> = self.notes.iter().filter(|n| n.group_id.as_deref() == Some(group_id)).cloned().collect();
        self.history.push(CanvasAction::BatchUpdate {
            before: initial_notes,
            after: after_notes,
        });
        self.status_message = "Ungrouped group".into();
    }

    /// Update note title
    pub fn update_note_title(&mut self, note_id: NoteId, title: impl Into<String>) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let initial = note.clone();
            note.title = title.into();
            note.touch();
            self.history.push(CanvasAction::UpdateNote {
                before: Box::new(initial),
                after: Box::new(note.clone()),
            });
        }
    }

    /// Update note body content
    pub fn update_note_body(&mut self, note_id: NoteId, body: impl Into<String>) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == note_id) {
            let initial = note.clone();
            note.body = body.into();
            note.touch();
            self.history.push(CanvasAction::UpdateNote {
                before: Box::new(initial),
                after: Box::new(note.clone()),
            });
        }
    }

    /// Extract all unique dates with daily journal entries (YYYY-MM-DD)
    pub fn get_daily_entry_dates(&self) -> Vec<String> {
        let mut dates = Vec::new();
        for note in &self.notes {
            if note.is_daily_entry {
                if let Some(date_str) = &note.entry_date {
                    if !dates.contains(date_str) {
                        dates.push(date_str.clone());
                    }
                }
            } else if note.title.len() == 10
                && note.title.chars().nth(4) == Some('-')
                && note.title.chars().nth(7) == Some('-')
                && !dates.contains(&note.title)
            {
                dates.push(note.title.clone());
            }
        }
        dates.sort();
        dates
    }

    /// Compute current consecutive daily journal streak
    pub fn get_journal_streak(&self) -> u32 {
        let dates = self.get_daily_entry_dates();
        if dates.is_empty() {
            return 0;
        }

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let yesterday = (chrono::Local::now() - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();

        if !dates.contains(&today) && !dates.contains(&yesterday) {
            return 0;
        }

        let mut streak = 0;
        let mut current_day = if dates.contains(&today) {
            chrono::Local::now().date_naive()
        } else {
            (chrono::Local::now() - chrono::Duration::days(1)).date_naive()
        };

        loop {
            let date_str = current_day.format("%Y-%m-%d").to_string();
            if dates.contains(&date_str) {
                streak += 1;
                current_day -= chrono::Duration::days(1);
            } else {
                break;
            }
        }

        streak
    }

    /// Open or create a daily journal entry for a given YYYY-MM-DD date
    pub fn open_or_create_daily_entry_for_date(&mut self, date_str: &str, viewport_width: f32, viewport_height: f32) -> NoteId {
        if let Some(existing) = self.notes.iter().find(|n| n.entry_date.as_deref() == Some(date_str) || n.title == date_str) {
            let id = existing.id;
            self.select_note(id, false);
            self.focus_selected_note(viewport_width, viewport_height);
            return id;
        }

        // Create new daily entry note
        let center_canvas = self.camera.screen_to_canvas(Point2D::new(
            viewport_width / 2.0 - 160.0,
            viewport_height / 2.0 - 120.0,
        ));
        let mut note = Note::new(date_str, format!("## {}\n\n- [ ] Daily tasks\n- [ ] Reflections\n", date_str), center_canvas);
        note.is_daily_entry = true;
        note.entry_date = Some(date_str.to_string());
        note.color_theme = ColorTheme::Amber;
        note.tags.push("journal".into());

        let id = note.id;
        self.history.push(CanvasAction::CreateNote(Box::new(note.clone())));
        self.notes.push(note);
        self.select_note(id, false);
        self.focus_selected_note(viewport_width, viewport_height);
        self.status_message = format!("Created journal entry for {}", date_str);
        id
    }

    /// Fit all notes within the viewport bounds
    pub fn fit_notes_in_view(&mut self, viewport_width: f32, viewport_height: f32) {
        if self.notes.is_empty() {
            return;
        }

        let mut min_x = f32::INFINITY;
        let mut min_y = f32::INFINITY;
        let mut max_x = f32::NEG_INFINITY;
        let mut max_y = f32::NEG_INFINITY;

        for note in &self.notes {
            min_x = min_x.min(note.position.x);
            min_y = min_y.min(note.position.y);
            max_x = max_x.max(note.position.x + note.size.width);
            max_y = max_y.max(note.position.y + note.size.height);
        }

        let padding = 80.0;
        let content_w = (max_x - min_x) + padding * 2.0;
        let content_h = (max_y - min_y) + padding * 2.0;

        let scale_x = viewport_width / content_w;
        let scale_y = viewport_height / content_h;
        let fit_zoom = scale_x.min(scale_y).clamp(0.25, 1.5);

        let center_x = (min_x + max_x) / 2.0;
        let center_y = (min_y + max_y) / 2.0;

        self.camera.zoom = fit_zoom;
        self.camera.pan_x = viewport_width / 2.0 - center_x * fit_zoom;
        self.camera.pan_y = viewport_height / 2.0 - center_y * fit_zoom;
        self.status_message = "Fitted all notes in view".into();
    }

    /// Calculate group bounding box
    pub fn get_group_bounds(&self, group_id: &str) -> Option<domain::spatial::bounds::Rect2D> {
        let group_notes: Vec<Note> = self.notes.iter().filter(|n| n.group_id.as_deref() == Some(group_id)).cloned().collect();
        if group_notes.is_empty() {
            return None;
        }
        Some(domain::spatial::layout::calculate_group_bounds(&group_notes, 28.0, 42.0, 28.0))
    }

    /// Get all unique tags across all notes
    pub fn get_unique_tags(&self) -> Vec<String> {
        let mut tags = Vec::new();
        for note in &self.notes {
            for tag in &note.tags {
                if !tags.contains(tag) {
                    tags.push(tag.clone());
                }
            }
        }
        tags.sort();
        tags
    }

    /// Mark a note as having unsaved modifications
    pub fn mark_dirty(&mut self, note_id: NoteId) {
        self.dirty_note_ids.insert(note_id);
    }

    /// Settle background save confirmation
    pub fn settle_save_success(&mut self) {
        self.dirty_note_ids.clear();
        self.is_saving = false;
        self.last_saved_at = Some(chrono::Utc::now());
        self.save_error = None;
        self.status_message = "All changes saved to SQLite".into();
    }

    /// Record save failure error message
    pub fn settle_save_error(&mut self, error_msg: impl Into<String>) {
        self.is_saving = false;
        let err = error_msg.into();
        self.save_error = Some(err.clone());
        self.status_message = format!("Save error: {}", err);
    }

    /// Compute textual indicator for the status bar
    pub fn get_storage_badge_text(&self) -> &'static str {
        if self.is_saving {
            "Saving..."
        } else if self.save_error.is_some() {
            "Storage Error"
        } else if !self.dirty_note_ids.is_empty() {
            "Unsaved Changes"
        } else {
            "Saved"
        }
    }

    /// Update active AI configuration
    pub fn update_ai_config(&mut self, config: AiConfig) {
        self.ai_config = config;
        self.status_message = "Updated AI configuration".into();
    }

    /// Store FTS search results
    pub fn set_fts_results(&mut self, results: Vec<SearchResultItem>) {
        self.fts_results = results;
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

    #[test]
    fn test_app_state_checklist_and_mood() {
        let mut state = AppState::new();
        let note_id = state.notes[2].id; // Tasks & Checklist note

        // Toggle first checklist item [x] -> [ ]
        let changed = state.toggle_checklist_item(note_id, 0);
        assert!(changed);
        assert!(state.notes[2].body.contains("- [ ] Migrate to Pure Rust & GPUI"));

        // Toggle second checklist item [x] -> [ ]
        let changed = state.toggle_checklist_item(note_id, 1);
        assert!(changed);
        assert!(state.notes[2].body.contains("- [ ] Integrate SQLite 3 WAL engine"));

        // Toggle third checklist item [ ] -> [x]
        let changed = state.toggle_checklist_item(note_id, 2);
        assert!(changed);
        assert!(state.notes[2].body.contains("- [x] Create your first daily note"));

        // Cycle mood
        let initial_mood = state.notes[0].mood;
        state.cycle_mood(state.notes[0].id);
        assert_ne!(state.notes[0].mood, initial_mood);
    }

    #[test]
    fn test_app_state_movement_and_box_select() {
        let mut state = AppState::new();
        let id0 = state.notes[0].id;
        let initial_pos = state.notes[0].position;

        state.move_notes_by(&[id0], 50.0, 50.0);
        assert_eq!(state.notes[0].position, Point2D::new(initial_pos.x + 50.0, initial_pos.y + 50.0));

        state.commit_notes_movement(&[(id0, initial_pos)]);
        assert!(state.history.can_undo());

        state.undo();
        assert_eq!(state.notes[0].position, initial_pos);

        // Box selection
        state.select_notes_in_box(Point2D::new(0.0, 0.0), Point2D::new(300.0, 300.0));
        assert!(state.selected_note_ids.contains(&id0));
    }

    #[test]
    fn test_app_state_alignments_and_groups() {
        let mut state = AppState::new();
        let id0 = state.notes[0].id;
        let id1 = state.notes[1].id;
        state.selected_note_ids = vec![id0, id1];

        // Test Align Top
        state.align_selected_notes_top();
        assert_eq!(state.notes[0].position.y, state.notes[1].position.y);

        // Test Group & Ungroup
        state.group_selected_notes();
        assert!(state.notes[0].group_id.is_some());
        assert_eq!(state.notes[0].group_id, state.notes[1].group_id);

        let group_id = state.notes[0].group_id.clone().unwrap();
        let bounds = state.get_group_bounds(&group_id);
        assert!(bounds.is_some());

        state.ungroup_selected_notes();
        assert!(state.notes[0].group_id.is_none());

        // Test Resize & Styling
        state.resize_note(id0, 400.0, 300.0);
        assert_eq!(state.notes[0].size.width, 400.0);
        assert_eq!(state.notes[0].size.height, 300.0);

        state.set_selected_notes_theme(ColorTheme::Violet);
        assert_eq!(state.notes[0].color_theme, ColorTheme::Violet);
        assert_eq!(state.notes[1].color_theme, ColorTheme::Violet);

        // Test Journal creation & streak
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let _ = state.open_or_create_daily_entry_for_date(&today, 1000.0, 800.0);
        let dates = state.get_daily_entry_dates();
        assert!(dates.contains(&today));
        assert_eq!(state.get_journal_streak(), 1);
    }

    #[test]
    fn test_app_state_dirty_settlement_and_ai_config() {
        let mut state = AppState::new();
        let id0 = state.notes[0].id;

        // Dirty settlement
        assert_eq!(state.get_storage_badge_text(), "Saved");
        state.mark_dirty(id0);
        assert_eq!(state.get_storage_badge_text(), "Unsaved Changes");

        state.is_saving = true;
        assert_eq!(state.get_storage_badge_text(), "Saving...");

        state.settle_save_success();
        assert_eq!(state.get_storage_badge_text(), "Saved");
        assert!(state.last_saved_at.is_some());

        state.settle_save_error("Disk full");
        assert_eq!(state.get_storage_badge_text(), "Storage Error");

        // AI Config
        let new_config = ai::provider::AiConfig::new(ai::provider::ProviderType::OpenAi)
            .with_api_key("sk-test-key")
            .with_model("gpt-4o");
        state.update_ai_config(new_config.clone());
        assert_eq!(state.ai_config.provider, ai::provider::ProviderType::OpenAi);
        assert_eq!(state.ai_config.model, "gpt-4o");
    }
}
