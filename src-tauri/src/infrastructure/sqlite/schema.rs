pub const INITIAL_SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    x REAL NOT NULL DEFAULT 0.0,
    y REAL NOT NULL DEFAULT 0.0,
    width REAL NOT NULL DEFAULT 380.0,
    height REAL NOT NULL DEFAULT 340.0,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT '',
    created_timestamp INTEGER,
    updated_timestamp INTEGER,
    font_family TEXT NOT NULL DEFAULT 'sans',
    font_size TEXT NOT NULL DEFAULT 'md',
    paper_theme TEXT NOT NULL DEFAULT 'white',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 1,
    active_mode TEXT,
    is_locked INTEGER NOT NULL DEFAULT 0,
    group_id TEXT,
    group_name TEXT,
    entry_date TEXT,
    is_daily_entry INTEGER NOT NULL DEFAULT 0,
    mood TEXT,
    image_url TEXT,
    image_type TEXT,
    image_aspect_ratio REAL,
    frame_style TEXT,
    pin_style TEXT,
    rotation REAL,
    is_covered INTEGER NOT NULL DEFAULT 0,
    cover_style TEXT,
    seal_style TEXT,
    cover_prompt TEXT
);

CREATE TABLE IF NOT EXISTS note_tags (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (note_id, tag)
);

CREATE TABLE IF NOT EXISTS assets (
    hash TEXT PRIMARY KEY NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_assets (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    asset_hash TEXT NOT NULL REFERENCES assets(hash),
    PRIMARY KEY (note_id, asset_hash)
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canvas_transform (
    id TEXT PRIMARY KEY NOT NULL,
    x REAL NOT NULL DEFAULT 300.0,
    y REAL NOT NULL DEFAULT 200.0,
    zoom REAL NOT NULL DEFAULT 1.0
);

-- Indexes for lightning-fast lookups
CREATE INDEX IF NOT EXISTS idx_notes_updated_timestamp ON notes(updated_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notes_daily ON notes(is_daily_entry, entry_date);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag);

-- Persistent FTS5 Full-Text Search Virtual Table (Trigram for multi-language substring matching)
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id UNINDEXED,
    title,
    content,
    tags,
    tokenize = 'trigram'
);

-- Triggers for automatic sync between notes and notes_fts (sanitizes locked notes to empty content)
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(id, title, content, tags) 
    VALUES (
        new.id, 
        new.title, 
        CASE WHEN new.is_locked = 1 THEN '' ELSE new.content END, 
        ''
    );
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
    INSERT INTO notes_fts(id, title, content, tags) 
    VALUES (
        new.id, 
        new.title, 
        CASE WHEN new.is_locked = 1 THEN '' ELSE new.content END, 
        ''
    );
END;
"#;
