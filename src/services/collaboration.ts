import { D1Database } from '@cloudflare/workers-types';

interface CollaborationPartner {
    id: string;
    name: string;
    email: string;
    role: 'accountability' | 'support' | 'collaborator';
    permissions: string[];
}

interface SharedTask {
    id: string;
    title: string;
    description?: string;
    owner: string;
    sharedWith: string[];
    progress: number;
    status: string;
    lastUpdate: Date;
    comments: TaskComment[];
}

interface TaskComment {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    timestamp: Date;
    type: 'progress' | 'support' | 'question' | 'celebration';
}

interface ProgressUpdate {
    taskId: string;
    userId: string;
    oldProgress: number;
    newProgress: number;
    timestamp: Date;
    message?: string;
}

export class CollaborationService {
    constructor(private db: D1Database) {}

    async addCollaborator(
        userId: string,
        partnerEmail: string,
        role: CollaborationPartner['role']
    ): Promise<CollaborationPartner> {
        // Check if partner exists in system
        const partner = await this.db.prepare(`
            SELECT id, name, email
            FROM users
            WHERE email = ?
        `).bind(partnerEmail).first();

        if (!partner) {
            // Send invitation if partner doesn't exist
            await this.sendCollaborationInvite(userId, partnerEmail, role);
            throw new Error('User not found. Invitation sent.');
        }

        // Default permissions based on role
        const permissions = this.getDefaultPermissions(role);

        // Add collaboration relationship
        await this.db.prepare(`
            INSERT INTO collaborations (
                user_id,
                partner_id,
                role,
                permissions,
                created_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            userId,
            partner.id,
            role,
            JSON.stringify(permissions)
        ).run();

        return {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            role,
            permissions
        };
    }

    private getDefaultPermissions(role: CollaborationPartner['role']): string[] {
        switch (role) {
            case 'accountability':
                return ['view_tasks', 'view_progress', 'add_comments', 'send_reminders'];
            case 'support':
                return ['view_tasks', 'add_comments', 'send_encouragement'];
            case 'collaborator':
                return ['view_tasks', 'edit_tasks', 'add_comments', 'track_progress'];
            default:
                return ['view_tasks'];
        }
    }

    async shareTask(taskId: string, userId: string, partnerIds: string[]): Promise<void> {
        // Verify task ownership
        const task = await this.db.prepare(`
            SELECT id FROM tasks WHERE id = ? AND user_id = ?
        `).bind(taskId, userId).first();

        if (!task) {
            throw new Error('Task not found or unauthorized');
        }

        // Share task with each partner
        for (const partnerId of partnerIds) {
            await this.db.prepare(`
                INSERT INTO shared_tasks (
                    task_id,
                    owner_id,
                    partner_id,
                    shared_at
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(taskId, userId, partnerId).run();
        }

        // Create initial progress record
        await this.updateTaskProgress(taskId, userId, 0, 'Task shared');
    }

    async updateTaskProgress(
        taskId: string,
        userId: string,
        progress: number,
        message?: string
    ): Promise<void> {
        // Get current progress
        const current = await this.db.prepare(`
            SELECT progress FROM task_progress
            WHERE task_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        `).bind(taskId).first();

        const oldProgress = current?.progress || 0;

        // Record progress update
        await this.db.prepare(`
            INSERT INTO task_progress (
                task_id,
                user_id,
                progress,
                old_progress,
                message,
                timestamp
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            taskId,
            userId,
            progress,
            oldProgress,
            message || null
        ).run();

        // If significant progress made, notify accountability partners
        if (progress - oldProgress >= 25) {
            await this.notifyProgressMilestone(taskId, userId, progress);
        }
    }

    async addTaskComment(
        taskId: string,
        userId: string,
        content: string,
        type: TaskComment['type']
    ): Promise<TaskComment> {
        const result = await this.db.prepare(`
            INSERT INTO task_comments (
                task_id,
                user_id,
                content,
                type,
                timestamp
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            RETURNING id, task_id, user_id, content, type, timestamp
        `).bind(taskId, userId, content, type).first();

        if (!result) {
            throw new Error('Failed to add comment');
        }

        return {
            id: result.id,
            taskId: result.task_id,
            userId: result.user_id,
            content: result.content,
            type: result.type as TaskComment['type'],
            timestamp: new Date(result.timestamp)
        };
    }

    async getSharedTasks(userId: string): Promise<SharedTask[]> {
        const tasks = await this.db.prepare(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.user_id as owner,
                t.status,
                tp.progress,
                t.updated_at as last_update,
                GROUP_CONCAT(st.partner_id) as shared_with
            FROM tasks t
            LEFT JOIN shared_tasks st ON t.id = st.task_id
            LEFT JOIN task_progress tp ON t.id = tp.task_id
            WHERE t.user_id = ? OR st.partner_id = ?
            GROUP BY t.id
            ORDER BY t.updated_at DESC
        `).bind(userId, userId).all();

        const tasksWithComments = await Promise.all(
            tasks.results.map(async task => {
                const comments = await this.getTaskComments(task.id);
                return {
                    ...task,
                    sharedWith: task.shared_with ? task.shared_with.split(',') : [],
                    lastUpdate: new Date(task.last_update),
                    comments
                };
            })
        );

        return tasksWithComments;
    }

    async getTaskComments(taskId: string): Promise<TaskComment[]> {
        const comments = await this.db.prepare(`
            SELECT 
                id,
                task_id,
                user_id,
                content,
                type,
                timestamp
            FROM task_comments
            WHERE task_id = ?
            ORDER BY timestamp DESC
        `).bind(taskId).all();

        return comments.results.map(comment => ({
            id: comment.id,
            taskId: comment.task_id,
            userId: comment.user_id,
            content: comment.content,
            type: comment.type as TaskComment['type'],
            timestamp: new Date(comment.timestamp)
        }));
    }

    async getProgressHistory(taskId: string): Promise<ProgressUpdate[]> {
        const updates = await this.db.prepare(`
            SELECT 
                task_id,
                user_id,
                progress as new_progress,
                old_progress,
                message,
                timestamp
            FROM task_progress
            WHERE task_id = ?
            ORDER BY timestamp DESC
        `).bind(taskId).all();

        return updates.results.map(update => ({
            taskId: update.task_id,
            userId: update.user_id,
            oldProgress: update.old_progress,
            newProgress: update.new_progress,
            message: update.message,
            timestamp: new Date(update.timestamp)
        }));
    }

    private async notifyProgressMilestone(
        taskId: string,
        userId: string,
        progress: number
    ): Promise<void> {
        // Get accountability partners
        const partners = await this.db.prepare(`
            SELECT partner_id
            FROM collaborations
            WHERE user_id = ? AND role = 'accountability'
        `).bind(userId).all();

        // Get task details
        const task = await this.db.prepare(`
            SELECT title FROM tasks WHERE id = ?
        `).bind(taskId).first();

        if (!task) return;

        // Notify each partner
        for (const partner of partners.results) {
            await this.addTaskComment(
                taskId,
                partner.partner_id,
                `🎉 Great progress! Task "${task.title}" is now ${progress}% complete!`,
                'celebration'
            );
        }
    }

    private async sendCollaborationInvite(
        userId: string,
        partnerEmail: string,
        role: string
    ): Promise<void> {
        await this.db.prepare(`
            INSERT INTO collaboration_invites (
                user_id,
                partner_email,
                role,
                created_at,
                token
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `).bind(
            userId,
            partnerEmail,
            role,
            crypto.randomUUID()
        ).run();

        // Note: Email sending would be implemented here
    }
}
