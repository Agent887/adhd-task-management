-- Add calendar integration support
CREATE TABLE IF NOT EXISTS user_calendar_tokens (
    user_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add calendar event ID to tasks
ALTER TABLE tasks
ADD COLUMN calendar_event_id TEXT;

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_event
ON tasks(calendar_event_id)
WHERE calendar_event_id IS NOT NULL;

-- Create view for calendar-related task information
CREATE VIEW IF NOT EXISTS v_calendar_tasks AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.cognitive_load,
    t.estimated_duration,
    t.due_date,
    t.calendar_event_id,
    u.timezone
FROM tasks t
JOIN users u ON t.user_id = u.id
WHERE t.calendar_event_id IS NOT NULL;
