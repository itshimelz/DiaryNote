pub mod error;
pub mod models;
pub mod repositories;
pub mod spatial;

pub use error::{DomainError, DomainResult};
pub use models::*;
pub use repositories::*;
pub use spatial::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_note_creation_and_aabb() {
        let note = Note::new(
            "Meeting Notes",
            "Discuss architecture",
            Point2D::new(100.0, 150.0),
        );
        assert_eq!(note.title, "Meeting Notes");
        assert_eq!(note.position.x, 100.0);
        assert_eq!(note.position.y, 150.0);

        let (min_x, min_y, max_x, max_y) = note.aabb();
        assert_eq!(min_x, 100.0);
        assert_eq!(min_y, 150.0);
        assert_eq!(max_x, 100.0 + Size2D::DEFAULT_NOTE.width);
        assert_eq!(max_y, 150.0 + Size2D::DEFAULT_NOTE.height);

        // AABB intersection
        assert!(note.intersects_rect(50.0, 100.0, 150.0, 200.0));
        assert!(!note.intersects_rect(0.0, 0.0, 50.0, 50.0));

        // Contains point
        assert!(note.contains_point(&Point2D::new(150.0, 200.0)));
        assert!(!note.contains_point(&Point2D::new(50.0, 50.0)));
    }

    #[test]
    fn test_note_duplicate() {
        let note = Note::new("Original", "Original Content", Point2D::new(50.0, 50.0));
        let dup = note.clone_as_duplicate(30.0, 40.0);

        assert_ne!(note.id, dup.id);
        assert_eq!(dup.title, "Original (Copy)");
        assert_eq!(dup.position.x, 80.0);
        assert_eq!(dup.position.y, 90.0);
    }

    #[test]
    fn test_camera_coordinate_transformations() {
        let camera = CanvasCamera::new(200.0, 100.0, 2.0);

        // World Point (10, 20) -> Screen: 10 * 2 + 200 = 220, 20 * 2 + 100 = 140
        let screen_pt = camera.canvas_to_screen(Point2D::new(10.0, 20.0));
        assert_eq!(screen_pt.x, 220.0);
        assert_eq!(screen_pt.y, 140.0);

        // Screen (220, 140) -> Canvas: (220 - 200) / 2 = 10, (140 - 100) / 2 = 20
        let canvas_pt = camera.screen_to_canvas(screen_pt);
        assert_eq!(canvas_pt.x, 10.0);
        assert_eq!(canvas_pt.y, 20.0);
    }

    #[test]
    fn test_spatial_rtree_index() {
        let note1 = Note::new("Note 1", "Body 1", Point2D::new(0.0, 0.0));
        let note2 = Note::new("Note 2", "Body 2", Point2D::new(1000.0, 1000.0));

        let mut index = SpatialIndex::new();
        index.insert(&note1);
        index.insert(&note2);

        assert_eq!(index.len(), 2);

        // Viewport query covering (0,0) to (400, 300)
        let viewport = Rect2D::new(-50.0, -50.0, 400.0, 300.0);
        let visible_ids = index.query_intersecting(&viewport);

        assert_eq!(visible_ids.len(), 1);
        assert_eq!(visible_ids[0], note1.id);

        // Remove note1
        assert!(index.remove(&note1.id));
        assert_eq!(index.len(), 1);
        let visible_ids_after = index.query_intersecting(&viewport);
        assert!(visible_ids_after.is_empty());
    }

    #[test]
    fn test_history_stack_undo_redo() {
        let mut history = HistoryStack::new(5);
        assert!(!history.can_undo());
        assert!(!history.can_redo());

        let note = Note::new("Test", "Body", Point2D::new(0.0, 0.0));
        let action = CanvasAction::CreateNote(Box::new(note.clone()));
        history.push(action.clone());

        assert!(history.can_undo());
        assert!(!history.can_redo());

        let popped = history.pop_undo().unwrap();
        assert_eq!(popped, action);
        assert!(!history.can_undo());

        history.push_redo(popped.inverse());
        assert!(history.can_redo());

        let redone = history.pop_redo().unwrap();
        match redone {
            CanvasAction::DeleteNote(n) => assert_eq!(n.id, note.id),
            _ => panic!("Expected DeleteNote on inverted CreateNote"),
        }
    }

    #[test]
    fn test_journal_streak_calculation() {
        let today = JournalDate::today();
        let dates = vec![today];
        let streak = StreakCalculator::calculate_streak(&dates);
        assert_eq!(streak, 1);
    }
}
