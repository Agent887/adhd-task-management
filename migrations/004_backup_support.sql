-- Add backup_metadata table
CREATE TABLE IF NOT EXISTS backup_metadata (
    timestamp INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('full', 'incremental')),
    checksum TEXT NOT NULL,
    key TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Add modified_at columns to existing tables if not present
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS modified_at INTEGER DEFAULT (unixepoch());
ALTER TABLE users ADD COLUMN IF NOT EXISTS modified_at INTEGER DEFAULT (unixepoch());
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS modified_at INTEGER DEFAULT (unixepoch());
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS modified_at INTEGER DEFAULT (unixepoch());

-- Add indexes for modified_at columns
CREATE INDEX IF NOT EXISTS idx_tasks_modified_at ON tasks(modified_at);
CREATE INDEX IF NOT EXISTS idx_users_modified_at ON users(modified_at);
CREATE INDEX IF NOT EXISTS idx_preferences_modified_at ON user_preferences(modified_at);
CREATE INDEX IF NOT EXISTS idx_metrics_modified_at ON user_metrics(modified_at);

-- Add index for backup metadata
CREATE INDEX IF NOT EXISTS idx_backup_metadata_type ON backup_metadata(type);

-- Add triggers to update modified_at
CREATE TRIGGER IF NOT EXISTS update_tasks_modified
    AFTER UPDATE ON tasks
    BEGIN
        UPDATE tasks SET modified_at = unixepoch()
        WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_users_modified
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET modified_at = unixepoch()
        WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_preferences_modified
    AFTER UPDATE ON user_preferences
    BEGIN
        UPDATE user_preferences SET modified_at = unixepoch()
        WHERE user_id = NEW.user_id;
    END;

CREATE TRIGGER IF NOT EXISTS update_metrics_modified
    AFTER UPDATE ON user_metrics
    BEGIN
        UPDATE user_metrics SET modified_at = unixepoch()
        WHERE id = NEW.id;
    END;
