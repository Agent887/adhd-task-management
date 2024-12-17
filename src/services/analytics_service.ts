import { D1Database } from '@cloudflare/workers-types';
import { api } from '../utils/api';
import { TaskAnalytics, ProductivityInsight } from '../types/analytics';

export class AnalyticsService {
    constructor(private db: D1Database) {}

    static async getAnalytics(timeRange: 'day' | 'week' | 'month'): Promise<TaskAnalytics> {
        // Mock data for development
        const mockData: TaskAnalytics = {
            completionRate: 75,
            averageCompletionTime: 45,
            averageFocusTime: 30,
            productivityScore: 82,
            peakPerformanceHours: Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                productivity: Math.random() * 100
            })),
            cognitiveLoadDistribution: [
                { load: 'low', percentage: 30 },
                { load: 'medium', percentage: 45 },
                { load: 'high', percentage: 25 }
            ],
            contextSwitchingPatterns: [
                { from: 'Work', to: 'Break', frequency: 5 },
                { from: 'Break', to: 'Work', frequency: 5 },
                { from: 'Work', to: 'Meeting', frequency: 3 }
            ],
            energyPatterns: Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                level: Math.random() * 100
            })),
            performanceData: Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (30 - i));
                return {
                    date: date.toISOString().split('T')[0],
                    completionRate: 60 + Math.random() * 30,
                    focusTime: 25 + Math.random() * 35,
                    productivityScore: 70 + Math.random() * 20
                };
            }),
            insights: [
                {
                    type: 'success',
                    title: 'Peak Performance Time',
                    description: 'You are most productive between 9 AM and 11 AM',
                    confidence: 0.85,
                    actionable: true,
                    suggestedAction: 'Schedule important tasks during morning hours'
                },
                {
                    type: 'pattern',
                    title: 'Focus Sessions',
                    description: 'Your focus sessions are most effective when limited to 25-30 minutes',
                    confidence: 0.78,
                    actionable: true,
                    suggestedAction: 'Use Pomodoro technique with 25-minute sessions'
                },
                {
                    type: 'challenge',
                    title: 'Context Switching',
                    description: 'Frequent task switching may be impacting your productivity',
                    confidence: 0.72,
                    actionable: true,
                    suggestedAction: 'Try grouping similar tasks together'
                }
            ]
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return mockData;
    }

    async getTaskAnalytics(userId: string, timeRange: 'day' | 'week' | 'month'): Promise<TaskAnalytics> {
        const [
            completionStats,
            peakHours,
            cognitiveLoad,
            contextSwitches,
            energyLevels
        ] = await Promise.all([
            this.calculateCompletionStats(userId, timeRange),
            this.analyzePeakHours(userId, timeRange),
            this.analyzeCognitiveLoad(userId, timeRange),
            this.analyzeContextSwitching(userId, timeRange),
            this.analyzeEnergyPatterns(userId, timeRange)
        ]);

        return {
            completionRate: completionStats.rate,
            averageCompletionTime: completionStats.averageTime,
            peakPerformanceHours: peakHours,
            cognitiveLoadDistribution: cognitiveLoad,
            contextSwitchingPatterns: contextSwitches,
            energyPatterns: energyLevels
        };
    }

    private async calculateCompletionStats(userId: string, timeRange: string) {
        const result = await this.db.prepare(`
            WITH task_stats AS (
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                    AVG(CASE 
                        WHEN status = 'completed' 
                        THEN JULIANDAY(completed_at) - JULIANDAY(created_at) 
                        ELSE NULL 
                    END) * 24 as avg_completion_hours
                FROM tasks
                WHERE user_id = ?
                AND created_at >= datetime('now', ?)
            )
            SELECT 
                CAST(completed_tasks AS FLOAT) / CAST(total_tasks AS FLOAT) as completion_rate,
                avg_completion_hours
            FROM task_stats
        `).bind(userId, this.getTimeRangeSQL(timeRange)).first();

        return {
            rate: result.completion_rate,
            averageTime: result.avg_completion_hours
        };
    }

    private async analyzePeakHours(userId: string, timeRange: string) {
        const results = await this.db.prepare(`
            WITH task_completions AS (
                SELECT 
                    strftime('%H', completed_at) as hour,
                    COUNT(*) as completions,
                    AVG(CASE 
                        WHEN cognitive_load = 'high' THEN 3
                        WHEN cognitive_load = 'medium' THEN 2
                        ELSE 1 
                    END) as avg_complexity
                FROM tasks
                WHERE user_id = ?
                AND status = 'completed'
                AND completed_at >= datetime('now', ?)
                GROUP BY hour
            )
            SELECT 
                CAST(hour AS INTEGER) as hour,
                completions * avg_complexity as productivity
            FROM task_completions
            ORDER BY productivity DESC
        `).bind(userId, this.getTimeRangeSQL(timeRange)).all();

        return results.results.map(r => ({
            hour: r.hour,
            productivity: r.productivity
        }));
    }

    private async analyzeCognitiveLoad(userId: string, timeRange: string) {
        const results = await this.db.prepare(`
            WITH load_stats AS (
                SELECT 
                    cognitive_load,
                    COUNT(*) as count,
                    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
                FROM tasks
                WHERE user_id = ?
                AND created_at >= datetime('now', ?)
                GROUP BY cognitive_load
            )
            SELECT 
                cognitive_load as load,
                percentage
            FROM load_stats
            ORDER BY percentage DESC
        `).bind(userId, this.getTimeRangeSQL(timeRange)).all();

        return results.results.map(r => ({
            load: r.load,
            percentage: r.percentage
        }));
    }

    private async analyzeContextSwitching(userId: string, timeRange: string) {
        const results = await this.db.prepare(`
            WITH context_switches AS (
                SELECT 
                    t1.context as from_context,
                    t2.context as to_context,
                    COUNT(*) as switches
                FROM tasks t1
                JOIN tasks t2 ON t1.user_id = t2.user_id
                    AND t2.started_at > t1.started_at
                    AND t1.context != t2.context
                WHERE t1.user_id = ?
                AND t1.started_at >= datetime('now', ?)
                GROUP BY t1.context, t2.context
            )
            SELECT 
                from_context,
                to_context,
                switches as frequency
            FROM context_switches
            ORDER BY switches DESC
            LIMIT 10
        `).bind(userId, this.getTimeRangeSQL(timeRange)).all();

        return results.results.map(r => ({
            from: r.from_context,
            to: r.to_context,
            frequency: r.frequency
        }));
    }

    private async analyzeEnergyPatterns(userId: string, timeRange: string) {
        const results = await this.db.prepare(`
            WITH energy_readings AS (
                SELECT 
                    strftime('%H', timestamp) as hour,
                    AVG(level) as avg_level
                FROM energy_levels
                WHERE user_id = ?
                AND timestamp >= datetime('now', ?)
                GROUP BY hour
            )
            SELECT 
                CAST(hour AS INTEGER) as hour,
                avg_level as level
            FROM energy_readings
            ORDER BY hour
        `).bind(userId, this.getTimeRangeSQL(timeRange)).all();

        return results.results.map(r => ({
            hour: r.hour,
            level: r.level
        }));
    }

    async generateInsights(userId: string): Promise<ProductivityInsight[]> {
        const insights: ProductivityInsight[] = [];
        const timeRanges = ['day', 'week', 'month'] as const;
        
        // Get analytics for different time ranges
        const analyticsData = await Promise.all(
            timeRanges.map(range => this.getTaskAnalytics(userId, range))
        );

        // Analyze completion rates
        const [dailyStats, weeklyStats, monthlyStats] = analyticsData;
        
        // Check completion rate trends
        if (weeklyStats.completionRate > 0.7) {
            insights.push({
                type: 'success',
                title: 'High Task Completion Rate',
                description: 'You\'re completing over 70% of your tasks this week. Great job staying productive!',
                confidence: 0.9,
                actionable: false
            });
        } else if (weeklyStats.completionRate < 0.3) {
            insights.push({
                type: 'challenge',
                title: 'Low Task Completion Rate',
                description: 'You\'re completing less than 30% of your tasks this week. Consider breaking down tasks into smaller, more manageable pieces.',
                confidence: 0.85,
                actionable: true,
                suggestedAction: 'Break down your next task into smaller subtasks'
            });
        }

        // Analyze peak performance hours
        const optimalHours = dailyStats.peakPerformanceHours
            .filter(hour => hour.productivity > 0.7)
            .map(hour => hour.hour);

        if (optimalHours.length > 0) {
            const formattedHours = optimalHours
                .map(hour => `${hour}:00`)
                .join(', ');
            
            insights.push({
                type: 'pattern',
                title: 'Peak Performance Hours',
                description: `You tend to be most productive at ${formattedHours}. Consider scheduling important tasks during these times.`,
                confidence: 0.8,
                actionable: true,
                suggestedAction: 'Schedule your next important task during your peak hours'
            });
        }

        // Analyze cognitive load distribution
        const highLoadTasks = monthlyStats.cognitiveLoadDistribution
            .find(dist => dist.load === 'high');
            
        if (highLoadTasks && highLoadTasks.percentage > 0.6) {
            insights.push({
                type: 'challenge',
                title: 'High Cognitive Load',
                description: 'Most of your tasks require high mental effort. Consider mixing in some lighter tasks to maintain energy levels.',
                confidence: 0.75,
                actionable: true,
                suggestedAction: 'Add some low-effort tasks to your schedule'
            });
        }

        // Analyze context switching
        const frequentSwitches = monthlyStats.contextSwitchingPatterns
            .filter(pattern => pattern.frequency > 5);
            
        if (frequentSwitches.length > 0) {
            insights.push({
                type: 'pattern',
                title: 'Frequent Context Switching',
                description: 'You often switch between different types of tasks. Try batching similar tasks together to reduce mental overhead.',
                confidence: 0.7,
                actionable: true,
                suggestedAction: 'Group similar tasks together in your schedule'
            });
        }

        // Analyze energy patterns
        const lowEnergyPeriods = dailyStats.energyPatterns
            .filter(pattern => pattern.level < 0.3)
            .map(pattern => pattern.hour);
            
        if (lowEnergyPeriods.length > 0) {
            const formattedPeriods = lowEnergyPeriods
                .map(hour => `${hour}:00`)
                .join(', ');
                
            insights.push({
                type: 'pattern',
                title: 'Energy Dips',
                description: `You tend to have lower energy levels around ${formattedPeriods}. Consider scheduling breaks or lighter tasks during these times.`,
                confidence: 0.8,
                actionable: true,
                suggestedAction: 'Schedule breaks during your typical low-energy periods'
            });
        }

        return insights;
    }

    private getTimeRangeSQL(timeRange: string): string {
        switch (timeRange) {
            case 'day':
                return '-1 day';
            case 'week':
                return '-7 days';
            case 'month':
                return '-30 days';
            default:
                return '-7 days';
        }
    }

    private formatHours(hours: number[]): string {
        return hours
            .map(h => {
                const hour = h % 12 || 12;
                const period = h < 12 ? 'AM' : 'PM';
                return `${hour}${period}`;
            })
            .join(', ');
    }
}
