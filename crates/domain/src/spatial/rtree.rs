use crate::models::note::{Note, NoteId};
use crate::spatial::bounds::Rect2D;
use rstar::{RTree, RTreeObject, AABB};

/// Spatial entry indexed in the R-Tree for fast $O(\log N)$ viewport culling
#[derive(Debug, Clone, PartialEq)]
pub struct SpatialNoteEntry {
    pub note_id: NoteId,
    pub min_x: f32,
    pub min_y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

impl SpatialNoteEntry {
    pub fn from_note(note: &Note) -> Self {
        let (min_x, min_y, max_x, max_y) = note.aabb();
        Self {
            note_id: note.id,
            min_x,
            min_y,
            max_x,
            max_y,
        }
    }
}

impl RTreeObject for SpatialNoteEntry {
    type Envelope = AABB<[f32; 2]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_corners([self.min_x, self.min_y], [self.max_x, self.max_y])
    }
}

/// In-Memory 2D Spatial Index for real-time viewport culling and selection queries
pub struct SpatialIndex {
    tree: RTree<SpatialNoteEntry>,
}

impl SpatialIndex {
    pub fn new() -> Self {
        Self { tree: RTree::new() }
    }

    pub fn from_notes(notes: &[Note]) -> Self {
        let entries: Vec<SpatialNoteEntry> =
            notes.iter().map(SpatialNoteEntry::from_note).collect();
        Self {
            tree: RTree::bulk_load(entries),
        }
    }

    pub fn insert(&mut self, note: &Note) {
        self.tree.insert(SpatialNoteEntry::from_note(note));
    }

    pub fn remove(&mut self, note_id: &NoteId) -> bool {
        let found = self.tree.iter().find(|e| e.note_id == *note_id).cloned();
        if let Some(entry) = found {
            self.tree.remove(&entry).is_some()
        } else {
            false
        }
    }

    pub fn update(&mut self, note: &Note) {
        self.remove(&note.id);
        self.insert(note);
    }

    /// Query all Note IDs that intersect with the given bounding box (e.g. current viewport)
    pub fn query_intersecting(&self, bounds: &Rect2D) -> Vec<NoteId> {
        let query_box =
            AABB::from_corners([bounds.min_x, bounds.min_y], [bounds.max_x, bounds.max_y]);
        self.tree
            .locate_in_envelope_intersecting(&query_box)
            .map(|entry| entry.note_id)
            .collect()
    }

    pub fn len(&self) -> usize {
        self.tree.size()
    }

    pub fn is_empty(&self) -> bool {
        self.tree.size() == 0
    }

    pub fn clear(&mut self) {
        self.tree = RTree::new();
    }
}

impl Default for SpatialIndex {
    fn default() -> Self {
        Self::new()
    }
}
