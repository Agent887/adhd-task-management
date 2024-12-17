import { LLMService } from './llm';

interface SubTask {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
    estimatedDuration: number;
    cognitiveLoad: number;
    order: number;
    notes?: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    subtasks: SubTask[];
    cognitiveLoad: number;
    totalEstimatedDuration: number;
    completionPercentage: number;
    aiSuggestions?: string[];
}

export class TaskBreakdownService {
    constructor(
        private db: D1Database,
        private llmService: LLMService
    ) {}

    async getTaskWithBreakdown(taskId: string): Promise<Task> {
        // Get main task
        const task = await this.db.prepare(`
            SELECT id, title, description, cognitive_load
            FROM tasks
            WHERE id = ?
        `).bind(taskId).first();

        // Get subtasks
        const subtasks = await this.db.prepare(`
            SELECT 
                id,
                title,
                status,
                estimated_duration,
                cognitive_load,
                subtask_order as order,
                notes
            FROM subtasks
            WHERE parent_task_id = ?
            ORDER BY subtask_order
        `).bind(taskId).all();

        // Calculate completion percentage
        const completedSubtasks = subtasks.results.filter(
            (st: any) => st.status === 'completed'
        ).length;
        const completionPercentage = subtasks.results.length > 0
            ? (completedSubtasks / subtasks.results.length) * 100
            : 0;

        // Calculate total duration
        const totalEstimatedDuration = subtasks.results.reduce(
            (sum: number, st: any) => sum + st.estimated_duration,
            0
        );

        return {
            ...task,
            subtasks: subtasks.results,
            completionPercentage,
            totalEstimatedDuration,
        };
    }

    async suggestTaskBreakdown(taskId: string): Promise<string[]> {
        const task = await this.db.prepare(`
            SELECT title, description, cognitive_load
            FROM tasks
            WHERE id = ?
        `).bind(taskId).first();

        const existingSubtasks = await this.db.prepare(`
            SELECT title
            FROM subtasks
            WHERE parent_task_id = ?
        `).bind(taskId).all();

        const suggestions = await this.llmService.suggestTaskBreakdown({
            task,
            existingSubtasks: existingSubtasks.results,
        });

        return suggestions;
    }

    async updateSubtask(
        taskId: string,
        subtaskId: string,
        updates: Partial<SubTask>
    ): Promise<void> {
        const updateFields = Object.keys(updates)
            .map(field => `${field} = ?`)
            .join(', ');

        await this.db.prepare(`
            UPDATE subtasks
            SET ${updateFields}
            WHERE id = ? AND parent_task_id = ?
        `).bind(
            ...Object.values(updates),
            subtaskId,
            taskId
        ).run();

        await this.updateTaskMetrics(taskId);
    }

    async reorderSubtasks(
        taskId: string,
        subtaskIds: string[]
    ): Promise<void> {
        // Begin transaction
        await this.db.prepare('BEGIN TRANSACTION').run();

        try {
            // Update order for each subtask
            for (let i = 0; i < subtaskIds.length; i++) {
                await this.db.prepare(`
                    UPDATE subtasks
                    SET subtask_order = ?
                    WHERE id = ? AND parent_task_id = ?
                `).bind(i, subtaskIds[i], taskId).run();
            }

            // Commit transaction
            await this.db.prepare('COMMIT').run();
        } catch (error) {
            // Rollback on error
            await this.db.prepare('ROLLBACK').run();
            throw error;
        }
    }

    private async updateTaskMetrics(taskId: string): Promise<void> {
        // Get updated subtask metrics
        const metrics = await this.db.prepare(`
            SELECT 
                COUNT(*) as total_subtasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_subtasks,
                SUM(cognitive_load) as total_cognitive_load,
                SUM(estimated_duration) as total_duration
            FROM subtasks
            WHERE parent_task_id = ?
        `).bind(taskId).first();

        // Update task with new metrics
        await this.db.prepare(`
            UPDATE tasks
            SET 
                completion_percentage = ?,
                cognitive_load = ?,
                estimated_duration = ?
            WHERE id = ?
        `).bind(
            (metrics.completed_subtasks / metrics.total_subtasks) * 100,
            metrics.total_cognitive_load,
            metrics.total_duration,
            taskId
        ).run();
    }

    async addSubtask(taskId: string, subtask: Omit<SubTask, 'id' | 'order'>): Promise<string> {
        const subtaskId = `st-${Date.now()}`;
        const order = await this.getNextSubtaskOrder(taskId);

        await this.db.prepare(`
            INSERT INTO subtasks (
                id,
                parent_task_id,
                title,
                status,
                estimated_duration,
                cognitive_load,
                subtask_order,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            subtaskId,
            taskId,
            subtask.title,
            subtask.status,
            subtask.estimatedDuration,
            subtask.cognitiveLoad,
            order,
            subtask.notes || null
        ).run();

        await this.updateTaskMetrics(taskId);

        return subtaskId;
    }

    private async getNextSubtaskOrder(taskId: string): Promise<number> {
        const result = await this.db.prepare(`
            SELECT MAX(subtask_order) as max_order
            FROM subtasks
            WHERE parent_task_id = ?
        `).bind(taskId).first();

        return (result.max_order || -1) + 1;
    }
}
