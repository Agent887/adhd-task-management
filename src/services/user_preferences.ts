import { UserPreferences } from '../types';

export class UserPreferencesService {
    constructor(private db: D1Database, private cache: KVNamespace) {}

    async getUserPreferences(userId: string): Promise<UserPreferences | null> {
        // Try cache first
        const cacheKey = `user-prefs:${userId}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Get from database
        const result = await this.db.prepare(
            'SELECT * FROM user_preferences WHERE user_id = ?'
        ).bind(userId).first();

        if (!result) return null;

        const preferences: UserPreferences = {
            userId: result.user_id,
            peakHours: JSON.parse(result.peak_hours),
            uiComplexity: result.ui_complexity,
            notificationPreferences: JSON.parse(result.notification_preferences),
            createdAt: new Date(result.created_at),
            updatedAt: new Date(result.updated_at)
        };

        // Cache the result
        await this.cache.put(cacheKey, JSON.stringify(preferences), {
            expirationTtl: 3600 // 1 hour
        });

        return preferences;
    }

    async createUserPreferences(preferences: Omit<UserPreferences, 'createdAt' | 'updatedAt'>): Promise<UserPreferences> {
        const now = new Date().toISOString();

        await this.db.prepare(`
            INSERT INTO user_preferences (
                user_id, peak_hours, ui_complexity,
                notification_preferences, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            preferences.userId,
            JSON.stringify(preferences.peakHours),
            preferences.uiComplexity,
            JSON.stringify(preferences.notificationPreferences),
            now,
            now
        ).run();

        const created: UserPreferences = {
            ...preferences,
            createdAt: new Date(now),
            updatedAt: new Date(now)
        };

        // Update cache
        const cacheKey = `user-prefs:${preferences.userId}`;
        await this.cache.put(cacheKey, JSON.stringify(created), {
            expirationTtl: 3600 // 1 hour
        });

        return created;
    }

    async updateUserPreferences(userId: string, updates: Partial<Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserPreferences | null> {
        const current = await this.getUserPreferences(userId);
        if (!current) return null;

        const updateFields = [];
        const values = [];

        if (updates.peakHours !== undefined) {
            updateFields.push('peak_hours = ?');
            values.push(JSON.stringify(updates.peakHours));
        }

        if (updates.uiComplexity !== undefined) {
            updateFields.push('ui_complexity = ?');
            values.push(updates.uiComplexity);
        }

        if (updates.notificationPreferences !== undefined) {
            updateFields.push('notification_preferences = ?');
            values.push(JSON.stringify(updates.notificationPreferences));
        }

        if (updateFields.length === 0) {
            return current;
        }

        updateFields.push('updated_at = ?');
        const now = new Date().toISOString();
        values.push(now);
        values.push(userId);

        await this.db.prepare(`
            UPDATE user_preferences 
            SET ${updateFields.join(', ')}
            WHERE user_id = ?
        `).bind(...values).run();

        // Invalidate cache
        const cacheKey = `user-prefs:${userId}`;
        await this.cache.delete(cacheKey);

        return this.getUserPreferences(userId);
    }

    async deleteUserPreferences(userId: string): Promise<void> {
        await this.db.prepare(
            'DELETE FROM user_preferences WHERE user_id = ?'
        ).bind(userId).run();

        // Remove from cache
        const cacheKey = `user-prefs:${userId}`;
        await this.cache.delete(cacheKey);
    }

    // Helper method to get default preferences
    getDefaultPreferences(userId: string): Omit<UserPreferences, 'createdAt' | 'updatedAt'> {
        return {
            userId,
            peakHours: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
            uiComplexity: 'moderate',
            notificationPreferences: {
                email: true,
                push: true,
                frequency: 'medium'
            }
        };
    }
}
