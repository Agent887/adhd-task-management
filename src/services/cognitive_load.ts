import { LLMService } from './llm';
import { EnergyTrackingService } from './energy_tracking';

interface CognitiveState {
    currentLoad: number;
    maxCapacity: number;
    energyLevel: number;
    focusLevel: number;
    timeOfDay: string;
}

interface UIAdaptation {
    complexity: 'minimal' | 'moderate' | 'full';
    features: string[];
    layout: string;
    colorScheme: string;
    notifications: boolean;
}

export class CognitiveLoadService {
    constructor(
        private db: D1Database,
        private llmService: LLMService,
        private energyService: EnergyTrackingService
    ) {}

    async getCurrentCognitiveState(userId: string): Promise<CognitiveState> {
        const currentTime = new Date().toISOString();
        
        // Get active tasks and their cognitive load
        const activeTasks = await this.db.prepare(`
            SELECT SUM(cognitive_load) as total_load
            FROM tasks
            WHERE user_id = ?
            AND status = 'in_progress'
        `).bind(userId).first();

        // Get user's current energy level
        const energy = await this.energyService.getCurrentEnergyLevel(userId);

        // Get recent context switches to assess cognitive overhead
        const recentSwitches = await this.db.prepare(`
            SELECT COUNT(*) as switch_count
            FROM context_switches
            WHERE user_id = ?
            AND timestamp > datetime('now', '-1 hour')
        `).bind(userId).first();

        // Calculate focus level based on context switches and energy
        const focusLevel = Math.max(1, 10 - (recentSwitches.switch_count || 0)) * (energy.level / 100);

        return {
            currentLoad: activeTasks.total_load || 0,
            maxCapacity: this.calculateMaxCapacity(energy.level, currentTime),
            energyLevel: energy.level,
            focusLevel,
            timeOfDay: this.getTimeOfDay(currentTime)
        };
    }

    private calculateMaxCapacity(energyLevel: number, currentTime: string): number {
        const baseCapacity = 100;
        const energyFactor = energyLevel / 100;
        const timeFactor = this.getTimeEfficiencyFactor(currentTime);
        return Math.round(baseCapacity * energyFactor * timeFactor);
    }

    private getTimeEfficiencyFactor(currentTime: string): number {
        const hour = new Date(currentTime).getHours();
        // Typical ADHD peak performance times (adjust based on user data)
        if (hour >= 10 && hour <= 12) return 1.2; // Late morning peak
        if (hour >= 15 && hour <= 17) return 1.1; // Afternoon peak
        if (hour >= 22 || hour <= 4) return 0.7;  // Late night/early morning dip
        return 1.0;
    }

    private getTimeOfDay(currentTime: string): string {
        const hour = new Date(currentTime).getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 22) return 'evening';
        return 'night';
    }

    async getRecommendedUIAdaptation(userId: string): Promise<UIAdaptation> {
        const cognitiveState = await this.getCurrentCognitiveState(userId);
        
        // Get user's UI preferences
        const preferences = await this.db.prepare(`
            SELECT ui_complexity, notification_preferences
            FROM user_preferences
            WHERE user_id = ?
        `).bind(userId).first();

        // Calculate optimal UI complexity
        const loadRatio = cognitiveState.currentLoad / cognitiveState.maxCapacity;
        let complexity: UIAdaptation['complexity'] = 'moderate';
        
        if (loadRatio > 0.8 || cognitiveState.energyLevel < 30) {
            complexity = 'minimal';
        } else if (loadRatio < 0.4 && cognitiveState.energyLevel > 70) {
            complexity = 'full';
        }

        // Determine available features based on cognitive state
        const features = this.getAvailableFeatures(complexity, cognitiveState);

        // Select color scheme based on time and energy
        const colorScheme = this.getColorScheme(cognitiveState);

        return {
            complexity,
            features,
            layout: this.getLayoutType(complexity),
            colorScheme,
            notifications: this.shouldEnableNotifications(cognitiveState)
        };
    }

    private getAvailableFeatures(
        complexity: UIAdaptation['complexity'],
        state: CognitiveState
    ): string[] {
        const allFeatures = [
            'task-creation',
            'task-editing',
            'context-switching',
            'analytics',
            'dependency-visualization',
            'energy-tracking',
            'suggestions',
            'advanced-filters'
        ];

        switch (complexity) {
            case 'minimal':
                return ['task-creation', 'task-editing', 'energy-tracking'];
            case 'moderate':
                return allFeatures.filter(f => f !== 'advanced-filters' && f !== 'analytics');
            case 'full':
                return allFeatures;
        }
    }

    private getLayoutType(complexity: UIAdaptation['complexity']): string {
        switch (complexity) {
            case 'minimal':
                return 'single-column';
            case 'moderate':
                return 'two-column';
            case 'full':
                return 'dashboard';
        }
    }

    private getColorScheme(state: CognitiveState): string {
        if (state.timeOfDay === 'night') return 'dark';
        if (state.energyLevel < 30) return 'calm';
        if (state.focusLevel > 7) return 'focused';
        return 'standard';
    }

    private shouldEnableNotifications(state: CognitiveState): boolean {
        return state.focusLevel > 3 && state.currentLoad < state.maxCapacity * 0.9;
    }

    async updateUserCognitiveMetrics(
        userId: string,
        taskId: string,
        metrics: {
            attentionLevel: number;
            distractionCount: number;
            completionTime: number;
        }
    ): Promise<void> {
        await this.db.prepare(`
            INSERT INTO cognitive_metrics (
                user_id,
                task_id,
                attention_level,
                distraction_count,
                completion_time,
                timestamp
            ) VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).bind(
            userId,
            taskId,
            metrics.attentionLevel,
            metrics.distractionCount,
            metrics.completionTime
        ).run();
    }
}
