import { D1Database } from '@cloudflare/workers-types';
import { Task, TimeBlock, TaskCompletionPattern, TimeRecommendation, UserPreferences } from '../types';
import { LLMService } from './llm';
import { PreferencesService } from './preferences';

export class TimeAnalysisService {
    constructor(
        private db: D1Database,
        private llm: LLMService,
        private preferences: PreferencesService
    ) {}

    async recordTaskCompletion(
        taskId: string,
        userId: string,
        completionData: Partial<TaskCompletionPattern>
    ): Promise<void> {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const timeOfDay = now.toLocaleTimeString('en-US', { hour12: false });

        await this.db
            .prepare(`
                INSERT INTO task_completion_patterns (
                    task_id, user_id, completed_at, day_of_week, time_of_day,
                    energy_level, focus_level, completion_duration,
                    interruption_count, satisfaction_rating
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                taskId,
                userId,
                now.toISOString(),
                dayOfWeek,
                timeOfDay,
                completionData.energy_level || 3,
                completionData.focus_level || 3,
                completionData.completion_duration,
                completionData.interruption_count || 0,
                completionData.satisfaction_rating || 3
            )
            .run();
    }

    async updateTimeBlock(
        userId: string,
        timeBlock: TimeBlock
    ): Promise<void> {
        await this.db
            .prepare(`
                INSERT OR REPLACE INTO time_blocks (
                    user_id, day_of_week, start_time, end_time,
                    energy_level, focus_level, preferred_task_types
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                userId,
                timeBlock.day_of_week,
                timeBlock.start_time,
                timeBlock.end_time,
                timeBlock.energy_level,
                timeBlock.focus_level,
                JSON.stringify(timeBlock.preferred_task_types)
            )
            .run();
    }

    async getTimeBlocks(userId: string): Promise<TimeBlock[]> {
        const result = await this.db
            .prepare('SELECT * FROM time_blocks WHERE user_id = ? ORDER BY day_of_week, start_time')
            .bind(userId)
            .all();

        return result.results.map(block => ({
            ...block,
            preferred_task_types: JSON.parse(block.preferred_task_types as string)
        })) as TimeBlock[];
    }

    async generateTimeRecommendations(
        task: Task,
        userId: string
    ): Promise<TimeRecommendation[]> {
        // Get user preferences and time blocks
        const [prefs, timeBlocks, patterns] = await Promise.all([
            this.preferences.getUserPreferences(userId),
            this.getTimeBlocks(userId),
            this.getTaskCompletionPatterns(task.id, userId)
        ]);

        // Use LLM to analyze patterns and generate recommendations
        const recommendations = await this.analyzePatterns(task, patterns, timeBlocks, prefs);

        // Save recommendations
        await this.saveRecommendations(task.id, userId, recommendations);

        return recommendations;
    }

    private async getTaskCompletionPatterns(
        taskId: string,
        userId: string
    ): Promise<TaskCompletionPattern[]> {
        const result = await this.db
            .prepare(`
                SELECT * FROM task_completion_patterns 
                WHERE task_id = ? AND user_id = ?
                ORDER BY completed_at DESC
                LIMIT 10
            `)
            .bind(taskId, userId)
            .all();

        return result.results as TaskCompletionPattern[];
    }

    private async analyzePatterns(
        task: Task,
        patterns: TaskCompletionPattern[],
        timeBlocks: TimeBlock[],
        prefs: UserPreferences
    ): Promise<TimeRecommendation[]> {
        const analysis = await this.llm.analyzeTimePatterns({
            task,
            patterns,
            timeBlocks,
            preferences: prefs
        });

        // Convert LLM analysis into structured recommendations
        return this.parseTimeRecommendations(analysis, task.id);
    }

    private async saveRecommendations(
        taskId: string,
        userId: string,
        recommendations: TimeRecommendation[]
    ): Promise<void> {
        // Clear old recommendations
        await this.db
            .prepare('DELETE FROM time_recommendations WHERE task_id = ? AND user_id = ?')
            .bind(taskId, userId)
            .run();

        // Insert new recommendations
        const stmt = this.db.prepare(`
            INSERT INTO time_recommendations (
                task_id, user_id, recommended_day, recommended_time,
                confidence_score, reasoning
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const batch = recommendations.map(rec => 
            stmt.bind(
                taskId,
                userId,
                rec.recommended_day,
                rec.recommended_time,
                rec.confidence_score,
                rec.reasoning
            )
        );

        await this.db.batch(batch);
    }

    private parseTimeRecommendations(
        llmAnalysis: string,
        taskId: string
    ): TimeRecommendation[] {
        try {
            const lines = llmAnalysis.split('\n');
            const recommendations: TimeRecommendation[] = [];
            let currentRec: Partial<TimeRecommendation> = {};

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('DAY:')) {
                    if (Object.keys(currentRec).length > 0) {
                        recommendations.push(currentRec as TimeRecommendation);
                    }
                    currentRec = { task_id: taskId };
                    currentRec.recommended_day = this.parseDayOfWeek(trimmed.split(':')[1].trim());
                } else if (trimmed.startsWith('TIME:')) {
                    currentRec.recommended_time = trimmed.split(':')[1].trim();
                } else if (trimmed.startsWith('CONFIDENCE:')) {
                    currentRec.confidence_score = parseFloat(trimmed.split(':')[1].trim());
                } else if (trimmed.startsWith('REASONING:')) {
                    currentRec.reasoning = trimmed.split(':')[1].trim();
                }
            }

            if (Object.keys(currentRec).length > 0) {
                recommendations.push(currentRec as TimeRecommendation);
            }

            return recommendations;
        } catch (error) {
            console.error('Error parsing time recommendations:', error);
            return [];
        }
    }

    private parseDayOfWeek(day: string): number {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const normalized = day.toLowerCase().trim();
        const index = days.indexOf(normalized);
        return index !== -1 ? index : 0;
    }
}
