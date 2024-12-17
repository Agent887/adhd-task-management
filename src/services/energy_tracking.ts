import { D1Database } from '@cloudflare/workers-types';
import { LLMService } from './llm';

interface EnergyLevel {
    energy_level: number;
    focus_level: number;
    mood?: string;
    stress_level?: number;
    sleep_quality?: number;
    medication_taken?: boolean;
    notes?: string;
}

interface EnergyPattern {
    day_of_week: number;
    hour: number;
    avg_energy_level: number;
    avg_focus_level: number;
    sample_size: number;
    confidence_score: number;
}

interface EnergyInfluencer {
    factor_type: string;
    impact_level: number;
    description: string;
    frequency: string;
}

export class EnergyTrackingService {
    constructor(
        private db: D1Database,
        private llm: LLMService
    ) {}

    async recordEnergyLevel(userId: string, data: EnergyLevel): Promise<void> {
        await this.db
            .prepare(`
                INSERT INTO energy_levels (
                    user_id, timestamp, energy_level, focus_level,
                    mood, stress_level, sleep_quality, medication_taken, notes
                ) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                userId,
                data.energy_level,
                data.focus_level,
                data.mood || 'neutral',
                data.stress_level || null,
                data.sleep_quality || null,
                data.medication_taken || false,
                data.notes || null
            )
            .run();

        // Update energy patterns after recording new data
        await this.updateEnergyPatterns(userId);
    }

    async getEnergyPatterns(userId: string): Promise<EnergyPattern[]> {
        const result = await this.db
            .prepare(`
                SELECT 
                    day_of_week, hour, avg_energy_level, avg_focus_level,
                    sample_size, confidence_score
                FROM energy_patterns
                WHERE user_id = ?
                ORDER BY day_of_week, hour
            `)
            .bind(userId)
            .all();

        return result.results as EnergyPattern[];
    }

    async getDailyEnergyReport(userId: string, date: string): Promise<any> {
        const result = await this.db
            .prepare(`
                SELECT * FROM daily_energy_summary
                WHERE user_id = ? AND date = ?
            `)
            .bind(userId, date)
            .first();

        return result;
    }

    async recordEnergyInfluencer(
        userId: string,
        influencer: EnergyInfluencer
    ): Promise<void> {
        await this.db
            .prepare(`
                INSERT INTO energy_influencers (
                    user_id, factor_type, impact_level,
                    description, frequency
                ) VALUES (?, ?, ?, ?, ?)
            `)
            .bind(
                userId,
                influencer.factor_type,
                influencer.impact_level,
                influencer.description,
                influencer.frequency
            )
            .run();
    }

    async getEnergyInfluencers(userId: string): Promise<EnergyInfluencer[]> {
        const result = await this.db
            .prepare('SELECT * FROM energy_influencers WHERE user_id = ?')
            .bind(userId)
            .all();

        return result.results as EnergyInfluencer[];
    }

    async analyzeEnergyTrends(userId: string): Promise<string> {
        const [patterns, influencers, recentLevels] = await Promise.all([
            this.getEnergyPatterns(userId),
            this.getEnergyInfluencers(userId),
            this.getRecentEnergyLevels(userId)
        ]);

        return this.llm.analyzeEnergyTrends({
            patterns,
            influencers,
            recentLevels
        });
    }

    private async updateEnergyPatterns(userId: string): Promise<void> {
        // Calculate patterns for each day and hour
        await this.db.exec(`
            INSERT OR REPLACE INTO energy_patterns (
                user_id, day_of_week, hour,
                avg_energy_level, avg_focus_level,
                sample_size, last_updated, confidence_score
            )
            SELECT 
                user_id,
                CAST(strftime('%w', timestamp) AS INTEGER) as day_of_week,
                CAST(strftime('%H', timestamp) AS INTEGER) as hour,
                AVG(energy_level) as avg_energy_level,
                AVG(focus_level) as avg_focus_level,
                COUNT(*) as sample_size,
                CURRENT_TIMESTAMP as last_updated,
                CASE 
                    WHEN COUNT(*) >= 10 THEN 1.0
                    ELSE COUNT(*) / 10.0
                END as confidence_score
            FROM energy_levels
            WHERE user_id = ?
            GROUP BY user_id, day_of_week, hour
        `, [userId]);
    }

    private async getRecentEnergyLevels(userId: string, days: number = 7): Promise<any[]> {
        const result = await this.db
            .prepare(`
                SELECT * FROM energy_levels
                WHERE user_id = ?
                AND timestamp >= datetime('now', ?)
                ORDER BY timestamp DESC
            `)
            .bind(userId, `-${days} days`)
            .all();

        return result.results;
    }

    async getPeakEnergyTimes(userId: string): Promise<{
        day_of_week: number;
        start_hour: number;
        end_hour: number;
        avg_energy: number;
        confidence: number;
    }[]> {
        const patterns = await this.getEnergyPatterns(userId);
        const peakTimes: any[] = [];
        
        // Group by day and find continuous blocks of high energy
        for (let day = 0; day < 7; day++) {
            const dayPatterns = patterns.filter(p => p.day_of_week === day)
                .sort((a, b) => a.hour - b.hour);

            let currentBlock = {
                start_hour: -1,
                end_hour: -1,
                total_energy: 0,
                hours: 0,
                confidence: 0
            };

            for (const pattern of dayPatterns) {
                if (pattern.avg_energy_level >= 3.5) { // Consider high energy
                    if (currentBlock.start_hour === -1) {
                        currentBlock.start_hour = pattern.hour;
                    }
                    currentBlock.end_hour = pattern.hour + 1;
                    currentBlock.total_energy += pattern.avg_energy_level;
                    currentBlock.hours++;
                    currentBlock.confidence += pattern.confidence_score;
                } else if (currentBlock.start_hour !== -1) {
                    // End of a block
                    if (currentBlock.hours >= 2) { // Minimum 2 hours
                        peakTimes.push({
                            day_of_week: day,
                            start_hour: currentBlock.start_hour,
                            end_hour: currentBlock.end_hour,
                            avg_energy: currentBlock.total_energy / currentBlock.hours,
                            confidence: currentBlock.confidence / currentBlock.hours
                        });
                    }
                    currentBlock = {
                        start_hour: -1,
                        end_hour: -1,
                        total_energy: 0,
                        hours: 0,
                        confidence: 0
                    };
                }
            }

            // Check last block
            if (currentBlock.start_hour !== -1 && currentBlock.hours >= 2) {
                peakTimes.push({
                    day_of_week: day,
                    start_hour: currentBlock.start_hour,
                    end_hour: currentBlock.end_hour,
                    avg_energy: currentBlock.total_energy / currentBlock.hours,
                    confidence: currentBlock.confidence / currentBlock.hours
                });
            }
        }

        return peakTimes.sort((a, b) => b.avg_energy - a.avg_energy);
    }
}
