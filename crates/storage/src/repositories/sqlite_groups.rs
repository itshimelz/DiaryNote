use crate::db::Database;
use async_trait::async_trait;
use domain::error::{DomainError, DomainResult};
use domain::models::connection::{ConnectionEdge, EdgeId, EdgeStyle};
use domain::models::group::{GroupFrame, GroupId};
use domain::models::note::{NoteId, Point2D, Size2D};
use domain::repositories::{ConnectionRepository, GroupRepository};
use rusqlite::params;

pub struct SqliteGroupRepository {
    db: Database,
}

impl SqliteGroupRepository {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
}

#[async_trait]
impl GroupRepository for SqliteGroupRepository {
    async fn get_all_groups(&self) -> DomainResult<Vec<GroupFrame>> {
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare(
                    "SELECT id, title, color, x, y, width, height, note_ids_json
                     FROM group_frames",
                )?;

                let rows = stmt.query_map([], |row| {
                    let id_str: String = row.get("id")?;
                    let title: String = row.get("title")?;
                    let color: String = row.get("color")?;
                    let x: f32 = row.get("x")?;
                    let y: f32 = row.get("y")?;
                    let width: f32 = row.get("width")?;
                    let height: f32 = row.get("height")?;
                    let note_ids_json: String = row.get("note_ids_json")?;

                    let id = id_str.parse::<GroupId>().unwrap_or_default();
                    let raw_ids: Vec<String> =
                        serde_json::from_str(&note_ids_json).unwrap_or_default();
                    let note_ids: Vec<NoteId> =
                        raw_ids.into_iter().filter_map(|s| s.parse().ok()).collect();

                    Ok(GroupFrame {
                        id,
                        title,
                        color,
                        position: Point2D::new(x, y),
                        size: Size2D::new_unchecked(width, height),
                        note_ids,
                    })
                })?;

                let mut groups = Vec::new();
                for r in rows {
                    groups.push(r?);
                }
                Ok(groups)
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn save_group(&self, group: &GroupFrame) -> DomainResult<()> {
        let note_ids_raw: Vec<String> = group.note_ids.iter().map(|id| id.to_string()).collect();
        let note_ids_json = serde_json::to_string(&note_ids_raw)
            .map_err(|e| DomainError::Serialization(e.to_string()))?;

        self.db
            .with_conn(|conn| {
                conn.execute(
                    "INSERT INTO group_frames (id, title, color, x, y, width, height, note_ids_json)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                     ON CONFLICT(id) DO UPDATE SET
                        title = excluded.title,
                        color = excluded.color,
                        x = excluded.x,
                        y = excluded.y,
                        width = excluded.width,
                        height = excluded.height,
                        note_ids_json = excluded.note_ids_json;",
                    params![
                        group.id.to_string(),
                        group.title,
                        group.color,
                        group.position.x,
                        group.position.y,
                        group.size.width,
                        group.size.height,
                        note_ids_json,
                    ],
                )?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn delete_group(&self, id: &GroupId) -> DomainResult<()> {
        let id_str = id.to_string();
        self.db
            .with_conn(|conn| {
                conn.execute("DELETE FROM group_frames WHERE id = ?1", [&id_str])?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }
}

pub struct SqliteConnectionRepository {
    db: Database,
}

impl SqliteConnectionRepository {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ConnectionRepository for SqliteConnectionRepository {
    async fn get_all_connections(&self) -> DomainResult<Vec<ConnectionEdge>> {
        self.db
            .with_conn(|conn| {
                let mut stmt = conn.prepare(
                    "SELECT id, from_note, to_note, label, style, color, arrow_start, arrow_end
                     FROM connection_edges",
                )?;

                let rows = stmt.query_map([], |row| {
                    let id_str: String = row.get("id")?;
                    let from_str: String = row.get("from_note")?;
                    let to_str: String = row.get("to_note")?;
                    let label: Option<String> = row.get("label")?;
                    let style_str: String = row.get("style")?;
                    let color: String = row.get("color")?;
                    let arrow_start: bool = row.get::<_, i32>("arrow_start")? != 0;
                    let arrow_end: bool = row.get::<_, i32>("arrow_end")? != 0;

                    let id = id_str.parse::<EdgeId>().unwrap_or_default();
                    let from_note = from_str.parse::<NoteId>().unwrap_or_default();
                    let to_note = to_str.parse::<NoteId>().unwrap_or_default();

                    Ok(ConnectionEdge {
                        id,
                        from_note,
                        to_note,
                        label,
                        style: match style_str.as_str() {
                            "dashed" => EdgeStyle::Dashed,
                            "dotted" => EdgeStyle::Dotted,
                            _ => EdgeStyle::Solid,
                        },
                        color,
                        arrow_start,
                        arrow_end,
                    })
                })?;

                let mut connections = Vec::new();
                for r in rows {
                    connections.push(r?);
                }
                Ok(connections)
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn save_connection(&self, edge: &ConnectionEdge) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                conn.execute(
                    "INSERT INTO connection_edges (id, from_note, to_note, label, style, color, arrow_start, arrow_end)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                     ON CONFLICT(id) DO UPDATE SET
                        from_note = excluded.from_note,
                        to_note = excluded.to_note,
                        label = excluded.label,
                        style = excluded.style,
                        color = excluded.color,
                        arrow_start = excluded.arrow_start,
                        arrow_end = excluded.arrow_end;",
                    params![
                        edge.id.to_string(),
                        edge.from_note.to_string(),
                        edge.to_note.to_string(),
                        edge.label,
                        match edge.style {
                            EdgeStyle::Dashed => "dashed",
                            EdgeStyle::Dotted => "dotted",
                            EdgeStyle::Solid => "solid",
                        },
                        edge.color,
                        edge.arrow_start as i32,
                        edge.arrow_end as i32,
                    ],
                )?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }

    async fn delete_connection(&self, id: &EdgeId) -> DomainResult<()> {
        let id_str = id.to_string();
        self.db
            .with_conn(|conn| {
                conn.execute("DELETE FROM connection_edges WHERE id = ?1", [&id_str])?;
                Ok(())
            })
            .map_err(|e| DomainError::Validation(e.to_string()))
    }
}
