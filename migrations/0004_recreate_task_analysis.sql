-- Drop and recreate task_analysis table
DROP TABLE IF EXISTS task_analysis;

CREATE TABLE task_analysis (
    task_id TEXT PRIMARY KEY,
    estimated_duration INTEGER NOT NULL,
    suggested_cognitive_load INTEGER NOT NULL,
    breakdown_steps TEXT NOT NULL, -- JSON array of steps
    suggested_tags TEXT NOT NULL, -- JSON array of tags
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
