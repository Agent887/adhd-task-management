-- Create task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    dependency_id INTEGER NOT NULL,
    dependency_type TEXT NOT NULL CHECK(
        dependency_type IN (
            'blocks',        -- This task blocks the dependent task
            'required_for',  -- This task is required for the dependent task
            'enhances',      -- This task enhances the dependent task but isn't required
            'related'        -- Tasks are related but don't have a strict dependency
        )
    ),
    impact_level INTEGER CHECK(impact_level BETWEEN 1 AND 5),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (dependency_id) REFERENCES tasks(id) ON DELETE CASCADE,
    -- Prevent self-referential dependencies
    CHECK (task_id != dependency_id),
    -- Prevent duplicate dependencies
    UNIQUE(task_id, dependency_id)
);

-- Create dependency chain analysis view
CREATE VIEW IF NOT EXISTS dependency_chains AS
WITH RECURSIVE chain AS (
    -- Base case: direct dependencies
    SELECT 
        task_id,
        dependency_id,
        dependency_type,
        1 as depth,
        task_id || '->' || dependency_id as path
    FROM task_dependencies
    
    UNION ALL
    
    -- Recursive case: find indirect dependencies
    SELECT 
        c.task_id,
        d.dependency_id,
        d.dependency_type,
        c.depth + 1,
        c.path || '->' || d.dependency_id
    FROM chain c
    JOIN task_dependencies d ON c.dependency_id = d.task_id
    WHERE c.depth < 5  -- Limit depth to prevent infinite loops
)
SELECT DISTINCT
    task_id,
    dependency_id,
    dependency_type,
    depth,
    path
FROM chain;

-- Create task complexity index
CREATE TABLE IF NOT EXISTS task_complexity_metrics (
    task_id INTEGER PRIMARY KEY,
    dependency_count INTEGER DEFAULT 0,
    blocking_count INTEGER DEFAULT 0,
    max_chain_depth INTEGER DEFAULT 0,
    complexity_score REAL,
    last_updated DATETIME,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create index for faster dependency lookups
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_dependency ON task_dependencies(dependency_id);

-- Create trigger to update task complexity metrics when dependencies change
CREATE TRIGGER IF NOT EXISTS update_task_complexity_insert
AFTER INSERT ON task_dependencies
FOR EACH ROW
BEGIN
    INSERT OR REPLACE INTO task_complexity_metrics (
        task_id,
        dependency_count,
        blocking_count,
        max_chain_depth,
        complexity_score,
        last_updated
    )
    SELECT 
        t.id,
        COUNT(DISTINCT d1.dependency_id),
        COUNT(DISTINCT d2.task_id),
        COALESCE(MAX(dc.depth), 0),
        (
            COUNT(DISTINCT d1.dependency_id) * 0.4 +
            COUNT(DISTINCT d2.task_id) * 0.3 +
            COALESCE(MAX(dc.depth), 0) * 0.3
        ) as complexity_score,
        CURRENT_TIMESTAMP
    FROM tasks t
    LEFT JOIN task_dependencies d1 ON t.id = d1.task_id
    LEFT JOIN task_dependencies d2 ON t.id = d2.dependency_id
    LEFT JOIN dependency_chains dc ON t.id = dc.task_id
    WHERE t.id = NEW.task_id
    GROUP BY t.id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_complexity_delete
AFTER DELETE ON task_dependencies
FOR EACH ROW
BEGIN
    INSERT OR REPLACE INTO task_complexity_metrics (
        task_id,
        dependency_count,
        blocking_count,
        max_chain_depth,
        complexity_score,
        last_updated
    )
    SELECT 
        t.id,
        COUNT(DISTINCT d1.dependency_id),
        COUNT(DISTINCT d2.task_id),
        COALESCE(MAX(dc.depth), 0),
        (
            COUNT(DISTINCT d1.dependency_id) * 0.4 +
            COUNT(DISTINCT d2.task_id) * 0.3 +
            COALESCE(MAX(dc.depth), 0) * 0.3
        ) as complexity_score,
        CURRENT_TIMESTAMP
    FROM tasks t
    LEFT JOIN task_dependencies d1 ON t.id = d1.task_id
    LEFT JOIN task_dependencies d2 ON t.id = d2.dependency_id
    LEFT JOIN dependency_chains dc ON t.id = dc.task_id
    WHERE t.id = OLD.task_id
    GROUP BY t.id;
END;
