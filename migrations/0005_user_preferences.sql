-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    peak_start_time TEXT NOT NULL DEFAULT '09:00',  -- 24-hour format
    peak_end_time TEXT NOT NULL DEFAULT '17:00',    -- 24-hour format
    max_daily_cognitive_load INTEGER NOT NULL DEFAULT 80,  -- Scale of 0-100
    preferred_task_chunk_duration INTEGER NOT NULL DEFAULT 25,  -- In minutes
    break_duration INTEGER NOT NULL DEFAULT 5,       -- In minutes
    ui_complexity_level TEXT NOT NULL DEFAULT 'balanced' CHECK(ui_complexity_level IN ('minimal', 'balanced', 'detailed')),
    notification_frequency TEXT NOT NULL DEFAULT 'medium' CHECK(notification_frequency IN ('low', 'medium', 'high')),
    task_breakdown_detail TEXT NOT NULL DEFAULT 'medium' CHECK(task_breakdown_detail IN ('low', 'medium', 'high')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create user peak hours table for more granular scheduling
CREATE TABLE IF NOT EXISTS user_peak_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    cognitive_capacity INTEGER NOT NULL DEFAULT 100,  -- Scale of 0-100
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Create user task preferences table for personalized task handling
CREATE TABLE IF NOT EXISTS user_task_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    task_type TEXT NOT NULL,  -- e.g., 'creative', 'analytical', 'administrative'
    preferred_time_of_day TEXT CHECK(preferred_time_of_day IN ('morning', 'afternoon', 'evening')),
    max_duration INTEGER,  -- In minutes
    min_break_after INTEGER,  -- In minutes
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_peak_hours_user_day ON user_peak_hours(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_task_prefs_user ON user_task_preferences(user_id, task_type);
