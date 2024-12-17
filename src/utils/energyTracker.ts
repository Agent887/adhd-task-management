import { Task } from '../types/task';

interface EnergyState {
  timestamp: Date;
  level: number;
  activity: string;
  context: string;
  taskId?: string;
  factors: {
    timeOfDay: number;
    taskComplexity: number;
    contextSwitches: number;
    interruptions: number;
  };
}

interface EnergyTrend {
  period: 'hour' | 'day' | 'week';
  average: number;
  peak: { time: Date; level: number };
  low: { time: Date; level: number };
  variance: number;
}

interface EnergyPrediction {
  expectedLevel: number;
  confidence: number;
  factors: {
    name: string;
    impact: number;
  }[];
  recommendations: string[];
}

export class EnergyTracker {
  private static readonly ENERGY_DECAY_RATE = 0.05; // per hour
  private static readonly RECOVERY_RATE = 0.1; // per hour of rest
  private static energyHistory: EnergyState[] = [];
  private static lastUpdate: Date | null = null;

  /**
   * Track real-time energy levels
   */
  static trackEnergy(
    level: number,
    context: string,
    taskId?: string
  ): EnergyState {
    const now = new Date();
    const state: EnergyState = {
      timestamp: now,
      level,
      activity: taskId ? 'task' : 'break',
      context,
      taskId,
      factors: {
        timeOfDay: this.calculateTimeOfDayImpact(now),
        taskComplexity: taskId ? this.calculateTaskComplexity(taskId) : 0,
        contextSwitches: this.calculateRecentContextSwitches(),
        interruptions: this.calculateRecentInterruptions()
      }
    };

    this.energyHistory.push(state);
    this.lastUpdate = now;

    // Trim history to last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.energyHistory = this.energyHistory.filter(s => s.timestamp > weekAgo);

    return state;
  }

  /**
   * Analyze energy patterns
   */
  static analyzePatterns(): EnergyTrend[] {
    return [
      this.analyzeTrend('hour'),
      this.analyzeTrend('day'),
      this.analyzeTrend('week')
    ];
  }

  /**
   * Predict future energy levels
   */
  static predictEnergy(
    futureTime: Date,
    plannedTasks: Task[]
  ): EnergyPrediction {
    const currentEnergy = this.getCurrentEnergy();
    const timeFactors = this.predictTimeFactors(futureTime);
    const taskFactors = this.predictTaskFactors(plannedTasks);
    const patternFactors = this.predictPatternFactors(futureTime);

    const factors = [
      { name: 'Time of Day', impact: timeFactors.impact },
      { name: 'Task Load', impact: taskFactors.impact },
      { name: 'Historical Pattern', impact: patternFactors.impact }
    ];

    const expectedLevel = this.calculateExpectedEnergy(
      currentEnergy,
      factors.map(f => f.impact)
    );

    const recommendations = this.generateRecommendations(
      expectedLevel,
      factors,
      plannedTasks
    );

    return {
      expectedLevel,
      confidence: this.calculatePredictionConfidence(factors),
      factors,
      recommendations
    };
  }

  /**
   * Get current energy analytics
   */
  static getCurrentAnalytics() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayStates = this.energyHistory.filter(s => s.timestamp >= todayStart);
    const averageToday = todayStates.reduce((sum, s) => sum + s.level, 0) / todayStates.length;

    return {
      currentEnergy: this.getCurrentEnergy(),
      averageToday,
      trend: this.analyzeTrend('day'),
      factors: this.analyzeEnergyFactors()
    };
  }

  private static getCurrentEnergy(): number {
    if (!this.lastUpdate) return 1.0;

    const lastState = this.energyHistory[this.energyHistory.length - 1];
    const hoursSinceUpdate = (new Date().getTime() - this.lastUpdate.getTime()) / (1000 * 60 * 60);

    return Math.max(0.1, lastState.level - (hoursSinceUpdate * this.ENERGY_DECAY_RATE));
  }

  private static calculateTimeOfDayImpact(time: Date): number {
    const hour = time.getHours();
    
    // Peak hours: 9-11 AM and 3-5 PM
    if ((hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 17)) {
      return 1.0;
    }
    // Good hours: 8-9 AM, 11 AM-3 PM, 5-6 PM
    else if ((hour >= 8 && hour < 9) || (hour > 11 && hour < 15) || (hour > 17 && hour <= 18)) {
      return 0.8;
    }
    // Less optimal hours: 6-8 AM, 6-8 PM
    else if ((hour >= 6 && hour < 8) || (hour > 18 && hour <= 20)) {
      return 0.6;
    }
    // Suboptimal hours: Before 6 AM, after 8 PM
    else {
      return 0.4;
    }
  }

  private static calculateTaskComplexity(taskId: string): number {
    // This would be implemented based on task data
    return 0.5;
  }

  private static calculateRecentContextSwitches(): number {
    const recentStates = this.getLast24HourStates();
    let switches = 0;

    for (let i = 1; i < recentStates.length; i++) {
      if (recentStates[i].context !== recentStates[i - 1].context) {
        switches++;
      }
    }

    return Math.min(switches / 10, 1); // Normalize to 0-1
  }

  private static calculateRecentInterruptions(): number {
    const recentStates = this.getLast24HourStates();
    const interruptions = recentStates.reduce(
      (count, state) => count + (state.factors.interruptions || 0),
      0
    );

    return Math.min(interruptions / 20, 1); // Normalize to 0-1
  }

  private static getLast24HourStates(): EnergyState[] {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return this.energyHistory.filter(s => s.timestamp > dayAgo);
  }

  private static analyzeTrend(period: 'hour' | 'day' | 'week'): EnergyTrend {
    const states = this.getStatesForPeriod(period);
    if (!states.length) {
      return {
        period,
        average: 0,
        peak: { time: new Date(), level: 0 },
        low: { time: new Date(), level: 0 },
        variance: 0
      };
    }

    const levels = states.map(s => s.level);
    const average = levels.reduce((a, b) => a + b, 0) / levels.length;
    const peak = states.reduce((a, b) => a.level > b.level ? a : b);
    const low = states.reduce((a, b) => a.level < b.level ? a : b);
    const variance = this.calculateVariance(levels, average);

    return {
      period,
      average,
      peak: { time: peak.timestamp, level: peak.level },
      low: { time: low.timestamp, level: low.level },
      variance
    };
  }

  private static getStatesForPeriod(period: 'hour' | 'day' | 'week'): EnergyState[] {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case 'hour':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    return this.energyHistory.filter(s => s.timestamp > cutoff);
  }

  private static calculateVariance(values: number[], mean: number): number {
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private static predictTimeFactors(time: Date): { impact: number } {
    const timeImpact = this.calculateTimeOfDayImpact(time);
    const dayOfWeek = time.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      impact: timeImpact * (isWeekend ? 0.9 : 1.0)
    };
  }

  private static predictTaskFactors(tasks: Task[]): { impact: number } {
    if (!tasks.length) return { impact: 1.0 };

    const complexitySum = tasks.reduce((sum, task) => {
      return sum + (task.focusLevel || 50) / 100;
    }, 0);

    return {
      impact: Math.max(0.1, 1 - (complexitySum / (tasks.length * 2)))
    };
  }

  private static predictPatternFactors(time: Date): { impact: number } {
    const historicalStates = this.energyHistory.filter(s => {
      const stateHour = s.timestamp.getHours();
      return stateHour === time.getHours();
    });

    if (!historicalStates.length) return { impact: 0.8 };

    const avgHistoricalEnergy = historicalStates.reduce(
      (sum, state) => sum + state.level,
      0
    ) / historicalStates.length;

    return {
      impact: avgHistoricalEnergy
    };
  }

  private static calculateExpectedEnergy(
    currentEnergy: number,
    impacts: number[]
  ): number {
    const avgImpact = impacts.reduce((a, b) => a + b, 0) / impacts.length;
    return Math.max(0.1, Math.min(1.0, currentEnergy * avgImpact));
  }

  private static calculatePredictionConfidence(
    factors: { name: string; impact: number }[]
  ): number {
    const historicalDataQuality = this.energyHistory.length / 100; // 0-1 based on amount of data
    const factorConsistency = 1 - this.calculateVariance(
      factors.map(f => f.impact),
      factors.reduce((sum, f) => sum + f.impact, 0) / factors.length
    );

    return Math.min(1, (historicalDataQuality + factorConsistency) / 2);
  }

  private static generateRecommendations(
    expectedEnergy: number,
    factors: { name: string; impact: number }[],
    plannedTasks: Task[]
  ): string[] {
    const recommendations: string[] = [];

    if (expectedEnergy < 0.3) {
      recommendations.push('Energy levels are predicted to be very low. Consider rescheduling high-focus tasks.');
    }

    const highImpactFactor = factors.find(f => f.impact < 0.5);
    if (highImpactFactor) {
      recommendations.push(`${highImpactFactor.name} is significantly impacting energy levels.`);
    }

    const highFocusTasks = plannedTasks.filter(t => t.focusLevel && t.focusLevel > 70);
    if (highFocusTasks.length > 2 && expectedEnergy < 0.7) {
      recommendations.push('Too many high-focus tasks planned for predicted energy levels.');
    }

    return recommendations;
  }

  private static analyzeEnergyFactors(): { factor: string; impact: number }[] {
    const recentStates = this.getLast24HourStates();
    if (!recentStates.length) return [];

    return [
      {
        factor: 'Time of Day',
        impact: this.calculateTimeOfDayImpact(new Date())
      },
      {
        factor: 'Context Switches',
        impact: this.calculateRecentContextSwitches()
      },
      {
        factor: 'Interruptions',
        impact: this.calculateRecentInterruptions()
      }
    ];
  }
}
