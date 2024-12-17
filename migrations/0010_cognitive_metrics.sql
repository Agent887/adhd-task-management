-- Create table for tracking cognitive metrics
CREATE TABLE IF NOT EXISTS cognitive_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    attention_level FLOAT NOT NULL,
    distraction_count INTEGER NOT NULL,
    completion_time INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_cognitive_metrics_user_time 
ON cognitive_metrics(user_id, timestamp);

-- Create view for cognitive load analysis
CREATE VIEW IF NOT EXISTS v_cognitive_load_trends AS
SELECT 
    user_id,
    strftime('%Y-%m-%d', timestamp) as date,
    strftime('%H', timestamp) as hour,
    AVG(attention_level) as avg_attention,
    SUM(distraction_count) as total_distractions,
    AVG(completion_time) as avg_completion_time
FROM cognitive_metrics
GROUP BY 
    user_id,
    strftime('%Y-%m-%d', timestamp),
    strftime('%H', timestamp);

-- Add cognitive_preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN cognitive_preferences TEXT DEFAULT '{"maxTasks": 5, "breakReminders": true, "uiComplexity": "moderate"}';

-- Create function to calculate cognitive load score
CREATE VIEW IF NOT EXISTS v_current_cognitive_load AS
SELECT 
    t.user_id,
    COUNT(t.id) as active_tasks,
    SUM(t.cognitive_load) as total_cognitive_load,
    AVG(cm.attention_level) as recent_attention_level,
    COUNT(cs.id) as recent_context_switches
FROM tasks t
LEFT JOIN cognitive_metrics cm 
    ON t.id = cm.task_id 
    AND cm.timestamp > datetime('now', '-1 hour')
LEFT JOIN context_switches cs 
    ON t.user_id = cs.user_id 
    AND cs.timestamp > datetime('now', '-1 hour')
WHERE t.status = 'in_progress'
GROUP BY t.user_id;
