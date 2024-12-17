import { Task, TaskAnalysis, UserPreferences, TaskCompletionRecord } from '../types';

export class DatabaseService {
    constructor(private db: D1Database) {}

    // Task Operations
    async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        
        const query = `
            INSERT INTO tasks (
                id, title, description, status, cognitive_load,
                created_at, updated_at, user_id,
                priority, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        console.log('Executing query:', query);
        console.log('With values:', [
            id,
            task.title,
            task.description || null,
            task.status,
            task.cognitiveLoad || null,
            now,
            now,
            task.userId,
            task.priority || 0,
            JSON.stringify(task.tags || [])
        ]);
        
        try {
            await this.db.prepare(query).bind(
                id,
                task.title,
                task.description || null,
                task.status,
                task.cognitiveLoad || null,
                now,
                now,
                task.userId,
                task.priority || 0,
                JSON.stringify(task.tags || [])
            ).run();

            return {
                id,
                ...task,
                createdAt: new Date(now),
                updatedAt: new Date(now)
            };
        } catch (error) {
            console.error('Database error:', error);
            throw error;
        }
    }

    async getTask(taskId: string): Promise<Task | null> {
        const result = await this.db.prepare(`
            SELECT * FROM tasks WHERE id = ?
        `).bind(taskId).first();

        if (!result) return null;

        return {
            id: result.id,
            title: result.title,
            description: result.description,
            status: result.status,
            cognitiveLoad: result.cognitive_load,
            userId: result.user_id,
            priority: result.priority,
            tags: JSON.parse(result.tags),
            createdAt: new Date(result.created_at),
            updatedAt: new Date(result.updated_at)
        };
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
        const task = await this.getTask(id);
        if (!task) return null;

        const updateFields = [];
        const values = [];
        
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && key !== 'id' && key !== 'createdAt') {
                updateFields.push(`${this.camelToSnake(key)} = ?`);
                values.push(
                    key === 'tags' ? JSON.stringify(value) : value
                );
            }
        });

        values.push(id);

        await this.db.prepare(`
            UPDATE tasks 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(...values).run();

        return this.getTask(id);
    }

    async getUserTasks(userId: string, status?: Task['status']): Promise<Task[]> {
        let query = 'SELECT * FROM tasks WHERE user_id = ?';
        const params = [userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY priority DESC, due_date ASC';

        const results = await this.db.prepare(query).bind(...params).all();
        return results.results.map(this.mapTaskFromDb);
    }

    async getTasksBatch(taskIds: string[]): Promise<Task[]> {
        if (taskIds.length === 0) return [];

        const placeholders = taskIds.map(() => '?').join(',');
        const query = `SELECT * FROM tasks WHERE id IN (${placeholders})`;

        try {
            const results = await this.db.prepare(query)
                .bind(...taskIds)
                .all();

            return results.results.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description,
                status: row.status,
                cognitiveLoad: row.cognitive_load,
                userId: row.user_id,
                priority: row.priority,
                tags: JSON.parse(row.tags),
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
        } catch (error) {
            console.error('Error getting tasks batch:', error);
            throw new Error('Failed to get tasks batch: ' + error.message);
        }
    }

    // Task Analysis Operations
    async saveTaskAnalysis(analysis: TaskAnalysis): Promise<void> {
        await this.db.prepare(`
            INSERT OR REPLACE INTO task_analysis (
                task_id,
                estimated_duration,
                suggested_cognitive_load,
                breakdown_steps,
                suggested_tags,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            analysis.taskId,
            analysis.estimatedDuration,
            analysis.suggestedCognitiveLoad,
            JSON.stringify(analysis.breakdownSteps),
            JSON.stringify(analysis.suggestedTags),
            new Date().toISOString()
        ).run();
    }

    async saveTaskAnalysisBatch(analyses: TaskAnalysis[]): Promise<void> {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO task_analysis (
                task_id, estimated_duration, cognitive_load,
                breakdown_steps, suggested_tags, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_id) DO UPDATE SET
                estimated_duration = excluded.estimated_duration,
                cognitive_load = excluded.cognitive_load,
                breakdown_steps = excluded.breakdown_steps,
                suggested_tags = excluded.suggested_tags,
                created_at = excluded.created_at
        `);

        const batch = analyses.map(analysis => stmt.bind(
            analysis.taskId,
            analysis.estimatedDuration,
            analysis.suggestedCognitiveLoad,
            JSON.stringify(analysis.breakdownSteps),
            JSON.stringify(analysis.suggestedTags),
            now
        ));

        try {
            await this.db.batch(batch);
        } catch (error) {
            console.error('Error saving task analyses batch:', error);
            throw new Error('Failed to save task analyses batch: ' + error.message);
        }
    }

    // User Preferences Operations
    async getUserPreferences(userId: string): Promise<UserPreferences | null> {
        const result = await this.db.prepare(
            'SELECT * FROM user_preferences WHERE user_id = ?'
        ).bind(userId).first();

        if (!result) return null;

        return {
            userId: result.user_id,
            peakHours: JSON.parse(result.peak_hours),
            uiComplexity: result.ui_complexity,
            notificationPreferences: JSON.parse(result.notification_preferences),
            createdAt: new Date(result.created_at),
            updatedAt: new Date(result.updated_at)
        };
    }

    // Helper methods
    private mapTaskFromDb(row: any): Task {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            cognitiveLoad: row.cognitive_load,
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            userId: row.user_id,
            parentTaskId: row.parent_task_id,
            estimatedDuration: row.estimated_duration,
            actualDuration: row.actual_duration,
            priority: row.priority,
            tags: JSON.parse(row.tags || '[]')
        };
    }

    private camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}
