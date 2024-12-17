-- Create energy level tracking table
CREATE TABLE IF NOT EXISTS energy_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    energy_level INTEGER NOT NULL CHECK(energy_level BETWEEN 1 AND 5),
    focus_level INTEGER NOT NULL CHECK(focus_level BETWEEN 1 AND 5),
    mood TEXT CHECK(mood IN ('great', 'good', 'neutral', 'low', 'poor')),
    stress_level INTEGER CHECK(stress_level BETWEEN 1 AND 5),
    sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 5),
    medication_taken BOOLEAN,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Create energy patterns table for ML analysis
CREATE TABLE IF NOT EXISTS energy_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    hour INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
    avg_energy_level REAL,
    avg_focus_level REAL,
    sample_size INTEGER,
    last_updated DATETIME,
    confidence_score REAL CHECK(confidence_score BETWEEN 0 AND 1),
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Create energy influencers table
CREATE TABLE IF NOT EXISTS energy_influencers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    factor_type TEXT NOT NULL CHECK(
        factor_type IN (
            'sleep',
            'medication',
            'exercise',
            'nutrition',
            'stress',
            'environment',
            'social',
            'other'
        )
    ),
    impact_level INTEGER NOT NULL CHECK(impact_level BETWEEN -5 AND 5),
    description TEXT,
    frequency TEXT CHECK(
        frequency IN (
            'always',
            'often',
            'sometimes',
            'rarely',
            'variable'
        )
    ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_energy_levels_user ON energy_levels(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_energy_patterns_user ON energy_patterns(user_id, day_of_week, hour);
CREATE INDEX IF NOT EXISTS idx_energy_influencers_user ON energy_influencers(user_id, factor_type);

-- Create view for daily energy summaries
CREATE VIEW IF NOT EXISTS daily_energy_summary AS
SELECT 
    user_id,
    DATE(timestamp) as date,
    AVG(energy_level) as avg_energy,
    AVG(focus_level) as avg_focus,
    MIN(energy_level) as min_energy,
    MAX(energy_level) as max_energy,
    COUNT(*) as num_readings,
    AVG(stress_level) as avg_stress,
    MAX(stress_level) as peak_stress,
    MODE(mood) as dominant_mood
FROM energy_levels
GROUP BY user_id, DATE(timestamp);
