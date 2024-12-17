-- Create context categories table
CREATE TABLE IF NOT EXISTS context_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cognitive_load_factor REAL CHECK(cognitive_load_factor BETWEEN 0.1 AND 2.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create task contexts table
CREATE TABLE IF NOT EXISTS task_contexts (
    task_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    relevance_score REAL CHECK(relevance_score BETWEEN 0.0 AND 1.0),
    PRIMARY KEY (task_id, category_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES context_categories(id) ON DELETE CASCADE
);

-- Create context switching history table
CREATE TABLE IF NOT EXISTS context_switches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    from_task_id INTEGER,
    to_task_id INTEGER,
    switch_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER,
    energy_level_before INTEGER CHECK(energy_level_before BETWEEN 1 AND 5),
    energy_level_after INTEGER CHECK(energy_level_after BETWEEN 1 AND 5),
    focus_level_before INTEGER CHECK(focus_level_before BETWEEN 1 AND 5),
    focus_level_after INTEGER CHECK(focus_level_after BETWEEN 1 AND 5),
    perceived_difficulty INTEGER CHECK(perceived_difficulty BETWEEN 1 AND 5),
    interruption_type TEXT CHECK(
        interruption_type IN (
            'planned',
            'unplanned',
            'emergency',
            'break',
            'distraction'
        )
    ),
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE,
    FOREIGN KEY (from_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (to_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Create context switching costs table
CREATE TABLE IF NOT EXISTS context_switching_costs (
    from_category_id INTEGER NOT NULL,
    to_category_id INTEGER NOT NULL,
    base_cost REAL CHECK(base_cost BETWEEN 0.0 AND 1.0),
    adhd_impact_multiplier REAL CHECK(adhd_impact_multiplier BETWEEN 1.0 AND 3.0),
    recovery_time_minutes INTEGER,
    confidence_score REAL CHECK(confidence_score BETWEEN 0.0 AND 1.0),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (from_category_id, to_category_id),
    FOREIGN KEY (from_category_id) REFERENCES context_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (to_category_id) REFERENCES context_categories(id) ON DELETE CASCADE
);

-- Create user context preferences table
CREATE TABLE IF NOT EXISTS user_context_preferences (
    user_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    preferred_time_of_day TEXT CHECK(
        preferred_time_of_day IN (
            'early_morning',
            'morning',
            'afternoon',
            'evening',
            'late_night'
        )
    ),
    max_daily_switches INTEGER,
    min_focus_duration_minutes INTEGER,
    recovery_duration_minutes INTEGER,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES context_categories(id) ON DELETE CASCADE
);

-- Create view for context switching analysis
CREATE VIEW IF NOT EXISTS context_switch_metrics AS
WITH user_switches AS (
    SELECT 
        user_id,
        DATE(switch_time) as switch_date,
        COUNT(*) as total_switches,
        AVG(perceived_difficulty) as avg_difficulty,
        AVG(energy_level_after - energy_level_before) as avg_energy_impact,
        AVG(focus_level_after - focus_level_before) as avg_focus_impact,
        SUM(CASE WHEN interruption_type = 'unplanned' THEN 1 ELSE 0 END) as unplanned_switches,
        AVG(duration_minutes) as avg_switch_duration
    FROM context_switches
    GROUP BY user_id, DATE(switch_time)
)
SELECT 
    s.*,
    CASE 
        WHEN total_switches > 10 THEN 'high'
        WHEN total_switches > 5 THEN 'medium'
        ELSE 'low'
    END as switch_load,
    CASE
        WHEN avg_energy_impact < -1 THEN 'high'
        WHEN avg_energy_impact < 0 THEN 'medium'
        ELSE 'low'
    END as energy_impact_level,
    ROUND(unplanned_switches * 100.0 / total_switches, 2) as unplanned_percentage
FROM user_switches s;

-- Insert default context categories
INSERT OR IGNORE INTO context_categories (name, description, cognitive_load_factor) VALUES
    ('Deep Work', 'Tasks requiring intense focus and complex problem-solving', 2.0),
    ('Communication', 'Emails, meetings, and other communication tasks', 1.2),
    ('Creative', 'Design, writing, and other creative tasks', 1.5),
    ('Administrative', 'Routine administrative tasks and organization', 1.0),
    ('Learning', 'Reading, research, and skill development', 1.8),
    ('Planning', 'Project planning, scheduling, and strategy', 1.4),
    ('Maintenance', 'System updates, cleanup, and maintenance tasks', 1.1);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_context_switches_user ON context_switches(user_id, switch_time);
CREATE INDEX IF NOT EXISTS idx_task_contexts_task ON task_contexts(task_id);
CREATE INDEX IF NOT EXISTS idx_task_contexts_category ON task_contexts(category_id);
CREATE INDEX IF NOT EXISTS idx_context_switching_costs ON context_switching_costs(from_category_id, to_category_id);
