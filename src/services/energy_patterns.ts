import { D1Database } from '@cloudflare/workers-types';

interface EnergyPattern {
    hour: number;
    averageEnergy: number;
    taskSuccessRate: number;
    preferredTaskTypes: string[];
}

interface TaskEnergyRequirement {
    id: string;
    title: string;
    estimatedEnergy: number;
    cognitiveLoad: number;
    contextCategory: string;
    deadline?: Date;
}

export class EnergyPatternService {
    constructor(private db: D1Database) {}

    async getUserEnergyPatterns(userId: string): Promise<EnergyPattern[]> {
        const patterns = await this.db.prepare(`
            WITH TaskSuccess AS (
                SELECT 
                    strftime('%H', completed_at) as hour,
                    AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_rate,
                    AVG(energy_level) as avg_energy
                FROM tasks
                WHERE user_id = ?
                    AND completed_at IS NOT NULL
                GROUP BY strftime('%H', completed_at)
            ),
            TaskTypes AS (
                SELECT 
                    strftime('%H', completed_at) as hour,
                    context_category,
                    COUNT(*) as type_count
                FROM tasks t
                JOIN task_contexts tc ON t.id = tc.task_id
                WHERE t.user_id = ?
                    AND status = 'completed'
                GROUP BY strftime('%H', completed_at), context_category
            )
            SELECT 
                ts.hour,
                ts.avg_energy,
                ts.success_rate,
                GROUP_CONCAT(DISTINCT tt.context_category) as preferred_task_types
            FROM TaskSuccess ts
            LEFT JOIN TaskTypes tt ON ts.hour = tt.hour
            GROUP BY ts.hour
            ORDER BY ts.hour
        `).bind(userId, userId).all();

        return patterns.results.map(p => ({
            hour: parseInt(p.hour),
            averageEnergy: p.avg_energy,
            taskSuccessRate: p.success_rate,
            preferredTaskTypes: p.preferred_task_types ? p.preferred_task_types.split(',') : []
        }));
    }

    async getOptimalTaskDistribution(
        userId: string,
        tasks: TaskEnergyRequirement[]
    ): Promise<Map<number, TaskEnergyRequirement[]>> {
        const patterns = await this.getUserEnergyPatterns(userId);
        const distribution = new Map<number, TaskEnergyRequirement[]>();

        // Initialize all hours
        for (let i = 0; i < 24; i++) {
            distribution.set(i, []);
        }

        // Sort tasks by deadline (if any) and energy requirements
        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.deadline && b.deadline) {
                return a.deadline.getTime() - b.deadline.getTime();
            }
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return b.estimatedEnergy - a.estimatedEnergy;
        });

        // Match tasks to optimal time slots
        for (const task of sortedTasks) {
            const optimalHour = this.findOptimalHour(task, patterns, distribution);
            if (optimalHour !== null) {
                distribution.get(optimalHour)?.push(task);
            }
        }

        return distribution;
    }

    private findOptimalHour(
        task: TaskEnergyRequirement,
        patterns: EnergyPattern[],
        currentDistribution: Map<number, TaskEnergyRequirement[]>
    ): number | null {
        let bestHour = null;
        let bestScore = -1;

        for (const pattern of patterns) {
            const hour = pattern.hour;
            const currentTasks = currentDistribution.get(hour) || [];
            
            // Skip if this hour is already overloaded
            if (this.calculateTotalEnergy(currentTasks) + task.estimatedEnergy > pattern.averageEnergy) {
                continue;
            }

            const score = this.calculateTaskHourScore(task, pattern);
            if (score > bestScore) {
                bestScore = score;
                bestHour = hour;
            }
        }

        return bestHour;
    }

    private calculateTaskHourScore(task: TaskEnergyRequirement, pattern: EnergyPattern): number {
        let score = 0;

        // Energy level match
        score += (pattern.averageEnergy >= task.estimatedEnergy) ? 2 : -1;

        // Success rate bonus
        score += pattern.taskSuccessRate * 1.5;

        // Context category match
        if (pattern.preferredTaskTypes.includes(task.contextCategory)) {
            score += 1;
        }

        // Cognitive load consideration
        if (task.cognitiveLoad > 7 && pattern.averageEnergy > 7) {
            score += 2; // Bonus for matching high-cognitive tasks with high-energy periods
        }

        return score;
    }

    private calculateTotalEnergy(tasks: TaskEnergyRequirement[]): number {
        return tasks.reduce((sum, task) => sum + task.estimatedEnergy, 0);
    }

    async suggestBreaks(userId: string): Promise<number[]> {
        const patterns = await this.getUserEnergyPatterns(userId);
        
        // Find periods of consistently low energy
        return patterns
            .filter(p => p.averageEnergy < 5)
            .map(p => p.hour);
    }

    async getEnergyInsights(userId: string): Promise<string[]> {
        const patterns = await this.getUserEnergyPatterns(userId);
        const insights: string[] = [];

        // Peak energy periods
        const peakHours = patterns
            .filter(p => p.averageEnergy > 7)
            .map(p => p.hour);
        if (peakHours.length > 0) {
            insights.push(`Your peak energy hours are: ${peakHours.map(h => `${h}:00`).join(', ')}`);
        }

        // Most successful task types by time
        const successfulPatterns = patterns
            .filter(p => p.taskSuccessRate > 0.8)
            .map(p => ({
                hour: p.hour,
                types: p.preferredTaskTypes
            }));
        
        successfulPatterns.forEach(p => {
            insights.push(
                `You're most successful with ${p.types.join(', ')} tasks around ${p.hour}:00`
            );
        });

        return insights;
    }
}
