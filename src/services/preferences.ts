import { D1Database } from '@cloudflare/workers-types';
import { UserPreferences, PeakHours, TaskPreferences } from '../types';

export class PreferencesService {
    constructor(private db: D1Database) {}

    async getUserPreferences(userId: string): Promise<UserPreferences> {
        const prefs = await this.db
            .prepare('SELECT * FROM user_preferences WHERE user_id = ?')
            .bind(userId)
            .first();
        
        if (!prefs) {
            // Create default preferences if none exist
            return this.createDefaultPreferences(userId);
        }

        return prefs as UserPreferences;
    }

    async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        const updates = Object.entries(preferences)
            .filter(([key]) => key !== 'user_id' && key !== 'created_at')
            .map(([key, value]) => `${key} = ?`);
        
        const values = Object.entries(preferences)
            .filter(([key]) => key !== 'user_id' && key !== 'created_at')
            .map(([_, value]) => value);

        const query = `
            UPDATE user_preferences 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        `;

        await this.db
            .prepare(query)
            .bind(...values, userId)
            .run();

        return this.getUserPreferences(userId);
    }

    async getPeakHours(userId: string): Promise<PeakHours[]> {
        return this.db
            .prepare('SELECT * FROM user_peak_hours WHERE user_id = ? ORDER BY day_of_week, start_time')
            .bind(userId)
            .all()
            .then(result => result.results as PeakHours[]);
    }

    async updatePeakHours(userId: string, peakHours: PeakHours[]): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM user_peak_hours WHERE user_id = ?');
        await stmt.bind(userId).run();

        const insertStmt = this.db.prepare(`
            INSERT INTO user_peak_hours (user_id, day_of_week, start_time, end_time, cognitive_capacity)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Use batch insert for better performance
        const batch = peakHours.map(ph => 
            insertStmt.bind(userId, ph.day_of_week, ph.start_time, ph.end_time, ph.cognitive_capacity)
        );

        await this.db.batch(batch);
    }

    async getTaskPreferences(userId: string): Promise<TaskPreferences[]> {
        return this.db
            .prepare('SELECT * FROM user_task_preferences WHERE user_id = ?')
            .bind(userId)
            .all()
            .then(result => result.results as TaskPreferences[]);
    }

    async updateTaskPreferences(userId: string, taskPrefs: TaskPreferences[]): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM user_task_preferences WHERE user_id = ?');
        await stmt.bind(userId).run();

        const insertStmt = this.db.prepare(`
            INSERT INTO user_task_preferences 
            (user_id, task_type, preferred_time_of_day, max_duration, min_break_after)
            VALUES (?, ?, ?, ?, ?)
        `);

        const batch = taskPrefs.map(tp => 
            insertStmt.bind(
                userId, 
                tp.task_type, 
                tp.preferred_time_of_day, 
                tp.max_duration, 
                tp.min_break_after
            )
        );

        await this.db.batch(batch);
    }

    private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
        const defaultPrefs: Omit<UserPreferences, 'created_at' | 'updated_at'> = {
            user_id: userId,
            peak_start_time: '09:00',
            peak_end_time: '17:00',
            max_daily_cognitive_load: 80,
            preferred_task_chunk_duration: 25,
            break_duration: 5,
            ui_complexity_level: 'balanced',
            notification_frequency: 'medium',
            task_breakdown_detail: 'medium'
        };

        await this.db
            .prepare(`
                INSERT INTO user_preferences (
                    user_id, peak_start_time, peak_end_time, max_daily_cognitive_load,
                    preferred_task_chunk_duration, break_duration, ui_complexity_level,
                    notification_frequency, task_breakdown_detail
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                defaultPrefs.user_id,
                defaultPrefs.peak_start_time,
                defaultPrefs.peak_end_time,
                defaultPrefs.max_daily_cognitive_load,
                defaultPrefs.preferred_task_chunk_duration,
                defaultPrefs.break_duration,
                defaultPrefs.ui_complexity_level,
                defaultPrefs.notification_frequency,
                defaultPrefs.task_breakdown_detail
            )
            .run();

        return this.getUserPreferences(userId);
    }
}
