use serde::{Deserialize, Serialize};
use ts_rs::TS;
use std::collections::HashMap;

use super::parser::{parse_markdown_links, ParsedLinks};
use crate::models::Note;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct NoteConnection {
    pub from_note_id: String,
    pub to_note_id: String,
    pub link_type: String, // "mention", "wikilink", "link"
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct BacklinkItem {
    pub source_note_id: String,
    pub source_note_title: String,
    pub link_type: String,
    pub context_snippet: String,
}

#[derive(Clone, Default)]
pub struct GraphService;

impl GraphService {
    pub fn new() -> Self {
        Self
    }

    pub fn parse_content(&self, content: &str) -> ParsedLinks {
        parse_markdown_links(content)
    }

    /// Computes all directed edges/connections across a collection of notes.
    pub fn get_connections(&self, notes: &[Note]) -> Vec<NoteConnection> {
        let mut connections = Vec::new();
        let mut title_to_id: HashMap<String, String> = HashMap::new();
        let mut id_to_title: HashMap<String, String> = HashMap::new();

        for note in notes {
            title_to_id.insert(note.title.trim().to_lowercase(), note.id.clone());
            id_to_title.insert(note.id.clone(), note.title.clone());
        }

        for note in notes {
            let parsed = parse_markdown_links(&note.content);

            // 1. Process @mentions
            for mention in parsed.mentions {
                let normalized = mention.trim().to_lowercase();
                if let Some(target_id) = title_to_id.get(&normalized) {
                    if target_id != &note.id {
                        connections.push(NoteConnection {
                            from_note_id: note.id.clone(),
                            to_note_id: target_id.clone(),
                            link_type: "mention".to_string(),
                            label: mention.clone(),
                        });
                    }
                } else if id_to_title.contains_key(&mention) && mention != note.id {
                    connections.push(NoteConnection {
                        from_note_id: note.id.clone(),
                        to_note_id: mention.clone(),
                        link_type: "mention".to_string(),
                        label: id_to_title.get(&mention).cloned().unwrap_or(mention),
                    });
                }
            }

            // 2. Process [[wikilinks]]
            for wikilink in parsed.wikilinks {
                let normalized = wikilink.trim().to_lowercase();
                if let Some(target_id) = title_to_id.get(&normalized) {
                    if target_id != &note.id {
                        connections.push(NoteConnection {
                            from_note_id: note.id.clone(),
                            to_note_id: target_id.clone(),
                            link_type: "wikilink".to_string(),
                            label: wikilink.clone(),
                        });
                    }
                }
            }

            // 3. Process markdown links
            for md_link in parsed.markdown_links {
                if let Some(target_id) = title_to_id.get(&md_link.target.trim().to_lowercase()) {
                    if target_id != &note.id {
                        connections.push(NoteConnection {
                            from_note_id: note.id.clone(),
                            to_note_id: target_id.clone(),
                            link_type: "link".to_string(),
                            label: md_link.text,
                        });
                    }
                }
            }
        }

        connections
    }

    /// Computes all incoming backlinks pointing to a specific note.
    pub fn get_backlinks(&self, target_note_id: &str, notes: &[Note]) -> Vec<BacklinkItem> {
        let target_note = notes.iter().find(|n| n.id == target_note_id);
        let target_title_normalized = target_note.map(|n| n.title.trim().to_lowercase());

        let mut backlinks = Vec::new();

        for note in notes {
            if note.id == target_note_id {
                continue;
            }

            let parsed = parse_markdown_links(&note.content);
            let mut matches_target = false;
            let mut link_type = "mention".to_string();

            for mention in &parsed.mentions {
                let norm = mention.trim().to_lowercase();
                if norm == target_note_id
                    || (target_title_normalized.is_some()
                        && Some(&norm) == target_title_normalized.as_ref())
                {
                    matches_target = true;
                    link_type = "mention".to_string();
                    break;
                }
            }

            if !matches_target {
                for wikilink in &parsed.wikilinks {
                    let norm = wikilink.trim().to_lowercase();
                    if target_title_normalized.is_some()
                        && Some(&norm) == target_title_normalized.as_ref()
                    {
                        matches_target = true;
                        link_type = "wikilink".to_string();
                        break;
                    }
                }
            }

            if matches_target {
                let context_snippet = if note.content.chars().count() > 140 {
                    format!("{}...", note.content.chars().take(140).collect::<String>())
                } else {
                    note.content.clone()
                };

                backlinks.push(BacklinkItem {
                    source_note_id: note.id.clone(),
                    source_note_title: note.title.clone(),
                    link_type,
                    context_snippet,
                });
            }
        }

        backlinks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_note(id: &str, title: &str, content: &str) -> Note {
        Note {
            id: id.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            x: 0.0,
            y: 0.0,
            width: 300.0,
            height: 200.0,
            created_at: "2026-08-17T00:00:00Z".to_string(),
            updated_at: "2026-08-17T00:00:00Z".to_string(),
            created_timestamp: None,
            updated_timestamp: None,
            font_family: "sans".to_string(),
            font_size: "md".to_string(),
            paper_theme: "white".to_string(),
            is_pinned: None,
            z_index: 1,
            active_mode: None,
            is_locked: None,
            group_id: None,
            group_name: None,
            entry_date: None,
            is_daily_entry: None,
            mood: None,
            image_url: None,
            image_type: None,
            image_aspect_ratio: None,
            frame_style: None,
            pin_style: None,
            rotation: None,
            tags: None,
            embedding: None,
        }
    }

    #[test]
    fn test_graph_service_connections_and_backlinks() {
        let note_a = create_mock_note("note-1", "Rust Architecture", "See @[Database Design] and [[API Gateway]].");
        let note_b = create_mock_note("note-2", "Database Design", "Contains SQLite tables and FTS5 triggers.");
        let note_c = create_mock_note("note-3", "API Gateway", "Handles Tauri IPC.");

        let notes = vec![note_a, note_b, note_c];
        let graph = GraphService::new();

        let connections = graph.get_connections(&notes);
        assert_eq!(connections.len(), 2);
        assert_eq!(connections[0].from_note_id, "note-1");
        assert_eq!(connections[0].to_note_id, "note-2");
        assert_eq!(connections[1].from_note_id, "note-1");
        assert_eq!(connections[1].to_note_id, "note-3");

        let backlinks = graph.get_backlinks("note-2", &notes);
        assert_eq!(backlinks.len(), 1);
        assert_eq!(backlinks[0].source_note_id, "note-1");
        assert_eq!(backlinks[0].source_note_title, "Rust Architecture");
    }
}
