-- Initial schema for Done365 app

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'deferred')) NOT NULL DEFAULT 'pending',
    cognitive_load INTEGER CHECK(cognitive_load BETWEEN 1 AND 10),
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL,
    parent_task_id TEXT REFERENCES tasks(id),
    estimated_duration INTEGER,  -- in minutes
    actual_duration INTEGER,     -- in minutes
    priority INTEGER DEFAULT 0,
    tags TEXT                    -- JSON array of tags
);

-- Task Analysis table (for caching LLM analysis)
CREATE TABLE IF NOT EXISTS task_analysis (
    task_id TEXT PRIMARY KEY REFERENCES tasks(id),
    complexity_score INTEGER CHECK(complexity_score BETWEEN 1 AND 10),
    suggested_breakdown TEXT,     -- JSON array of subtasks
    attention_required INTEGER CHECK(attention_required BETWEEN 1 AND 10),
    executive_load INTEGER CHECK(executive_load BETWEEN 1 AND 10),
    memory_load INTEGER CHECK(memory_load BETWEEN 1 AND 10),
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    peak_hours TEXT,             -- JSON array of preferred working hours
    ui_complexity TEXT CHECK(ui_complexity IN ('minimal', 'moderate', 'detailed')) DEFAULT 'moderate',
    notification_preferences TEXT, -- JSON object of notification settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task Completion History
CREATE TABLE IF NOT EXISTS task_completion_history (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id),
    user_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cognitive_state TEXT,         -- JSON object of user's cognitive state
    environment_factors TEXT,     -- JSON object of environmental factors
    success_rating INTEGER CHECK(success_rating BETWEEN 1 AND 5)
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_completion_user_id ON task_completion_history(user_id);
CREATE INDEX idx_task_completion_completed_at ON task_completion_history(completed_at);
