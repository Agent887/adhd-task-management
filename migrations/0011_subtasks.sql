-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    parent_task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    estimated_duration INTEGER DEFAULT 0,
    cognitive_load INTEGER DEFAULT 1,
    subtask_order INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_subtasks_parent 
ON subtasks(parent_task_id, subtask_order);

-- Create triggers to update tasks table when subtasks change
CREATE TRIGGER IF NOT EXISTS update_task_metrics_insert
AFTER INSERT ON subtasks
FOR EACH ROW
BEGIN
    UPDATE tasks
    SET 
        completion_percentage = (
            SELECT COALESCE(
                (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
                0
            )
            FROM subtasks
            WHERE parent_task_id = NEW.parent_task_id
        ),
        cognitive_load = (
            SELECT COALESCE(SUM(cognitive_load), 0)
            FROM subtasks
            WHERE parent_task_id = NEW.parent_task_id
        ),
        estimated_duration = (
            SELECT COALESCE(SUM(estimated_duration), 0)
            FROM subtasks
            WHERE parent_task_id = NEW.parent_task_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parent_task_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_metrics_update
AFTER UPDATE ON subtasks
FOR EACH ROW
BEGIN
    UPDATE tasks
    SET 
        completion_percentage = (
            SELECT COALESCE(
                (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
                0
            )
            FROM subtasks
            WHERE parent_task_id = NEW.parent_task_id
        ),
        cognitive_load = (
            SELECT COALESCE(SUM(cognitive_load), 0)
            FROM subtasks
            WHERE parent_task_id = NEW.parent_task_id
        ),
        estimated_duration = (
            SELECT COALESCE(SUM(estimated_duration), 0)
            FROM subtasks
            WHERE parent_task_id = NEW.parent_task_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parent_task_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_metrics_delete
AFTER DELETE ON subtasks
FOR EACH ROW
BEGIN
    UPDATE tasks
    SET 
        completion_percentage = (
            SELECT COALESCE(
                (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
                0
            )
            FROM subtasks
            WHERE parent_task_id = OLD.parent_task_id
        ),
        cognitive_load = (
            SELECT COALESCE(SUM(cognitive_load), 0)
            FROM subtasks
            WHERE parent_task_id = OLD.parent_task_id
        ),
        estimated_duration = (
            SELECT COALESCE(SUM(estimated_duration), 0)
            FROM subtasks
            WHERE parent_task_id = OLD.parent_task_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.parent_task_id;
END;

-- Create view for task breakdown analysis
CREATE VIEW IF NOT EXISTS v_task_breakdown_metrics AS
SELECT 
    t.id as task_id,
    t.title as task_title,
    COUNT(s.id) as subtask_count,
    SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_subtasks,
    AVG(s.cognitive_load) as avg_subtask_load,
    SUM(s.estimated_duration) as total_estimated_duration,
    t.completion_percentage,
    t.cognitive_load as total_cognitive_load,
    t.updated_at
FROM tasks t
LEFT JOIN subtasks s ON t.id = s.parent_task_id
GROUP BY t.id;

-- Add subtask_suggestions column to tasks
ALTER TABLE tasks 
ADD COLUMN subtask_suggestions TEXT;

-- Create function to get next subtask order
CREATE VIEW IF NOT EXISTS v_next_subtask_order AS
SELECT 
    parent_task_id,
    COALESCE(MAX(subtask_order) + 1, 0) as next_order
FROM subtasks
GROUP BY parent_task_id;
