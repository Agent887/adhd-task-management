import { CalendarIntegrationService } from './calendar_integration';
import { EnergyPatternService } from './energy_patterns';

interface ScheduledTask {
    id: string;
    title: string;
    description?: string;
    estimatedEnergy: number;
    cognitiveLoad: number;
    contextCategory: string;
    startTime: string;
    endTime: string;
}

export class ScheduleSyncService {
    constructor(
        private calendarService: CalendarIntegrationService,
        private energyService: EnergyPatternService,
        private db: D1Database
    ) {}

    async syncEnergyAwareSchedule(userId: string, date: Date): Promise<void> {
        try {
            // Get tasks for the specified date
            const tasks = await this.getTasksForDate(userId, date);
            
            // Get energy-optimized distribution
            const distribution = await this.energyService.getOptimalTaskDistribution(
                userId,
                tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    estimatedEnergy: t.estimatedEnergy,
                    cognitiveLoad: t.cognitiveLoad,
                    contextCategory: t.contextCategory
                }))
            );

            // Convert distribution to scheduled tasks
            const scheduledTasks = this.convertDistributionToSchedule(distribution, date);

            // Sync with calendar
            await this.syncWithCalendar(userId, scheduledTasks);

            // Update task schedule in database
            await this.updateTaskSchedule(userId, scheduledTasks);
        } catch (error) {
            console.error('Error syncing schedule:', error);
            throw new Error('Failed to sync schedule with calendar');
        }
    }

    private async getTasksForDate(userId: string, date: Date): Promise<ScheduledTask[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await this.db.prepare(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.estimated_energy,
                t.cognitive_load,
                tc.context_id as context_category,
                t.scheduled_start,
                t.scheduled_end
            FROM tasks t
            LEFT JOIN task_contexts tc ON t.id = tc.task_id
            WHERE t.user_id = ?
                AND t.status = 'pending'
                AND (
                    (t.scheduled_start BETWEEN ? AND ?)
                    OR t.deadline BETWEEN ? AND ?
                    OR t.deadline IS NULL
                )
        `).bind(
            userId,
            startOfDay.toISOString(),
            endOfDay.toISOString(),
            startOfDay.toISOString(),
            endOfDay.toISOString()
        ).all();

        return tasks.results.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            estimatedEnergy: task.estimated_energy,
            cognitiveLoad: task.cognitive_load,
            contextCategory: task.context_category,
            startTime: task.scheduled_start,
            endTime: task.scheduled_end
        }));
    }

    private convertDistributionToSchedule(
        distribution: Map<number, any[]>,
        date: Date
    ): ScheduledTask[] {
        const scheduledTasks: ScheduledTask[] = [];

        distribution.forEach((tasks, hour) => {
            tasks.forEach((task, index) => {
                const startTime = new Date(date);
                startTime.setHours(hour);
                startTime.setMinutes(index * 30); // 30-minute slots

                const endTime = new Date(startTime);
                endTime.setMinutes(startTime.getMinutes() + 30);

                scheduledTasks.push({
                    ...task,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                });
            });
        });

        return scheduledTasks;
    }

    private async syncWithCalendar(userId: string, tasks: ScheduledTask[]): Promise<void> {
        for (const task of tasks) {
            try {
                await this.calendarService.createTaskEvent(userId, {
                    id: task.id,
                    title: task.title,
                    description: this.generateEventDescription(task),
                    startTime: task.startTime,
                    endTime: task.endTime,
                    cognitiveLoad: task.cognitiveLoad
                });
            } catch (error) {
                console.error(`Error syncing task ${task.id} to calendar:`, error);
                // Continue with other tasks even if one fails
            }
        }
    }

    private async updateTaskSchedule(userId: string, tasks: ScheduledTask[]): Promise<void> {
        const stmt = await this.db.prepare(`
            UPDATE tasks
            SET 
                scheduled_start = ?,
                scheduled_end = ?,
                last_synced = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `);

        for (const task of tasks) {
            try {
                await stmt.bind(
                    task.startTime,
                    task.endTime,
                    task.id,
                    userId
                ).run();
            } catch (error) {
                console.error(`Error updating task ${task.id} schedule:`, error);
            }
        }
    }

    private generateEventDescription(task: ScheduledTask): string {
        const energyLevel = task.estimatedEnergy >= 7 ? 'High' :
            task.estimatedEnergy >= 4 ? 'Medium' : 'Low';

        return `
🧠 Task Details:
----------------
Context: ${task.contextCategory}
Energy Required: ${energyLevel}
Cognitive Load: ${task.cognitiveLoad}/10

${task.description || ''}

Generated by Done365 - ADHD Task Management
        `.trim();
    }

    async getScheduleSummary(userId: string, date: Date): Promise<{
        scheduledTasks: number;
        totalEnergy: number;
        peakLoadHour: number;
        suggestedBreaks: number[];
    }> {
        const tasks = await this.getTasksForDate(userId, date);
        const breaks = await this.energyService.suggestBreaks(userId);

        const hourlyLoad = new Map<number, number>();
        tasks.forEach(task => {
            const hour = new Date(task.startTime).getHours();
            hourlyLoad.set(hour, (hourlyLoad.get(hour) || 0) + task.estimatedEnergy);
        });

        let peakLoadHour = 0;
        let maxLoad = 0;
        hourlyLoad.forEach((load, hour) => {
            if (load > maxLoad) {
                maxLoad = load;
                peakLoadHour = hour;
            }
        });

        return {
            scheduledTasks: tasks.length,
            totalEnergy: tasks.reduce((sum, task) => sum + task.estimatedEnergy, 0),
            peakLoadHour,
            suggestedBreaks: breaks
        };
    }
}
