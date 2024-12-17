-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    peak_hours TEXT NOT NULL, -- JSON array of hour strings
    ui_complexity TEXT NOT NULL CHECK (ui_complexity IN ('simple', 'moderate', 'detailed')),
    notification_preferences TEXT NOT NULL, -- JSON object
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
