import { D1Database } from '@cloudflare/workers-types';
import { LLMService } from './llm';
import { EnergyTrackingService } from './energy_tracking';

interface ContextSwitch {
    from_task_id?: number;
    to_task_id?: number;
    energy_level_before: number;
    energy_level_after: number;
    focus_level_before: number;
    focus_level_after: number;
    perceived_difficulty: number;
    interruption_type: 'planned' | 'unplanned' | 'emergency' | 'break' | 'distraction';
    duration_minutes?: number;
    notes?: string;
}

interface ContextCategory {
    id: number;
    name: string;
    description: string;
    cognitive_load_factor: number;
}

interface SwitchingCost {
    base_cost: number;
    adhd_impact_multiplier: number;
    recovery_time_minutes: number;
    confidence_score: number;
}

interface UserContextPreference {
    category_id: number;
    preferred_time_of_day: string;
    max_daily_switches: number;
    min_focus_duration_minutes: number;
    recovery_duration_minutes: number;
}

export class ContextSwitchingService {
    constructor(
        private db: D1Database,
        private llm: LLMService,
        private energyService: EnergyTrackingService
    ) {}

    async recordContextSwitch(userId: string, switchData: ContextSwitch): Promise<void> {
        await this.db
            .prepare(`
                INSERT INTO context_switches (
                    user_id, from_task_id, to_task_id,
                    energy_level_before, energy_level_after,
                    focus_level_before, focus_level_after,
                    perceived_difficulty, interruption_type,
                    duration_minutes, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                userId,
                switchData.from_task_id || null,
                switchData.to_task_id || null,
                switchData.energy_level_before,
                switchData.energy_level_after,
                switchData.focus_level_before,
                switchData.focus_level_after,
                switchData.perceived_difficulty,
                switchData.interruption_type,
                switchData.duration_minutes || null,
                switchData.notes || null
            )
            .run();

        // Update energy tracking
        await this.energyService.recordEnergyLevel(userId, {
            energy_level: switchData.energy_level_after,
            focus_level: switchData.focus_level_after,
            notes: `Context switch: ${switchData.interruption_type}`,
        });
    }

    async getTaskContexts(taskId: number): Promise<ContextCategory[]> {
        const result = await this.db
            .prepare(`
                SELECT c.*, tc.relevance_score
                FROM context_categories c
                JOIN task_contexts tc ON c.id = tc.category_id
                WHERE tc.task_id = ?
                ORDER BY tc.relevance_score DESC
            `)
            .bind(taskId)
            .all();

        return result.results as ContextCategory[];
    }

    async calculateSwitchingCost(
        fromTaskId: number,
        toTaskId: number,
        userId: string
    ): Promise<{
        cost: number;
        recoveryTime: number;
        recommendation: string;
    }> {
        // Get contexts for both tasks
        const [fromContexts, toContexts, userPrefs, energyLevel] = await Promise.all([
            this.getTaskContexts(fromTaskId),
            this.getTaskContexts(toTaskId),
            this.getUserContextPreferences(userId),
            this.energyService.getCurrentEnergyLevel(userId),
        ]);

        // Calculate base switching cost
        let totalCost = 0;
        let maxRecoveryTime = 0;

        for (const fromContext of fromContexts) {
            for (const toContext of toContexts) {
                const switchCost = await this.getContextSwitchingCost(
                    fromContext.id,
                    toContext.id
                );

                const userPref = userPrefs.find(p => p.category_id === toContext.id);
                const timeOfDay = this.getCurrentTimeOfDay();
                const timeMultiplier =
                    userPref && userPref.preferred_time_of_day === timeOfDay ? 0.8 : 1.2;

                const energyMultiplier = this.calculateEnergyMultiplier(energyLevel);

                totalCost +=
                    switchCost.base_cost *
                    switchCost.adhd_impact_multiplier *
                    timeMultiplier *
                    energyMultiplier;

                maxRecoveryTime = Math.max(
                    maxRecoveryTime,
                    switchCost.recovery_time_minutes
                );
            }
        }

        // Get AI recommendation
        const recommendation = await this.llm.analyzeSwitchingCost({
            fromContexts,
            toContexts,
            cost: totalCost,
            recoveryTime: maxRecoveryTime,
            energyLevel,
            timeOfDay: this.getCurrentTimeOfDay(),
        });

        return {
            cost: totalCost,
            recoveryTime: maxRecoveryTime,
            recommendation,
        };
    }

    async getUserContextPreferences(userId: string): Promise<UserContextPreference[]> {
        const result = await this.db
            .prepare('SELECT * FROM user_context_preferences WHERE user_id = ?')
            .bind(userId)
            .all();

        return result.results as UserContextPreference[];
    }

    async updateUserContextPreferences(
        userId: string,
        preferences: UserContextPreference[]
    ): Promise<void> {
        const stmt = await this.db.prepare(`
            INSERT OR REPLACE INTO user_context_preferences (
                user_id, category_id, preferred_time_of_day,
                max_daily_switches, min_focus_duration_minutes,
                recovery_duration_minutes
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const pref of preferences) {
            await stmt
                .bind(
                    userId,
                    pref.category_id,
                    pref.preferred_time_of_day,
                    pref.max_daily_switches,
                    pref.min_focus_duration_minutes,
                    pref.recovery_duration_minutes
                )
                .run();
        }
    }

    async analyzeContextSwitchingPatterns(userId: string): Promise<any> {
        const [metrics, preferences] = await Promise.all([
            this.db
                .prepare('SELECT * FROM context_switch_metrics WHERE user_id = ? LIMIT 30')
                .bind(userId)
                .all(),
            this.getUserContextPreferences(userId),
        ]);

        return this.llm.analyzeContextSwitchingPatterns({
            metrics: metrics.results,
            preferences,
        });
    }

    async suggestOptimalSwitchingTimes(
        userId: string,
        taskId: number
    ): Promise<{
        optimal_times: string[];
        reasoning: string;
    }> {
        const [
            taskContexts,
            userPrefs,
            energyPatterns,
            currentTask,
        ] = await Promise.all([
            this.getTaskContexts(taskId),
            this.getUserContextPreferences(userId),
            this.energyService.getEnergyPatterns(userId),
            this.db
                .prepare('SELECT * FROM tasks WHERE id = ?')
                .bind(taskId)
                .first(),
        ]);

        return this.llm.suggestOptimalSwitchingTimes({
            taskContexts,
            userPrefs,
            energyPatterns,
            currentTask,
        });
    }

    private async getContextSwitchingCost(
        fromCategoryId: number,
        toCategoryId: number
    ): Promise<SwitchingCost> {
        const result = await this.db
            .prepare(`
                SELECT * FROM context_switching_costs
                WHERE from_category_id = ? AND to_category_id = ?
            `)
            .bind(fromCategoryId, toCategoryId)
            .first();

        return result as SwitchingCost;
    }

    private getCurrentTimeOfDay(): string {
        const hour = new Date().getHours();
        if (hour < 6) return 'late_night';
        if (hour < 9) return 'early_morning';
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        if (hour < 22) return 'evening';
        return 'late_night';
    }

    private calculateEnergyMultiplier(energyLevel: number): number {
        // Higher energy levels reduce switching cost
        return 2 - (energyLevel / 5);
    }
}
