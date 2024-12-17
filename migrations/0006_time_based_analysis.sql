-- Create time block preferences table
CREATE TABLE IF NOT EXISTS time_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    energy_level INTEGER NOT NULL CHECK(energy_level BETWEEN 1 AND 5),
    focus_level INTEGER NOT NULL CHECK(focus_level BETWEEN 1 AND 5),
    preferred_task_types TEXT, -- JSON array of task types best suited for this time block
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Create task completion patterns table
CREATE TABLE IF NOT EXISTS task_completion_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    completed_at DATETIME NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    time_of_day TEXT NOT NULL,
    energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 5),
    focus_level INTEGER CHECK(focus_level BETWEEN 1 AND 5),
    completion_duration INTEGER, -- in minutes
    interruption_count INTEGER DEFAULT 0,
    satisfaction_rating INTEGER CHECK(satisfaction_rating BETWEEN 1 AND 5),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Create time-based recommendations table
CREATE TABLE IF NOT EXISTS time_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    recommended_day INTEGER CHECK(recommended_day BETWEEN 0 AND 6),
    recommended_time TEXT NOT NULL,
    confidence_score REAL NOT NULL CHECK(confidence_score BETWEEN 0 AND 1),
    reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_user ON time_blocks(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_completion_patterns_user ON task_completion_patterns(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_completion_patterns_task ON task_completion_patterns(task_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_time_recommendations_task ON time_recommendations(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_recommendations_user ON time_recommendations(user_id, recommended_day, recommended_time);
