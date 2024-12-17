import { Task } from '../types/task';

interface ContextState {
  currentContext: string;
  startTime: Date;
  energyLevel: number;
  focusLevel: number;
  interruptions: number;
  taskId?: string;
}

interface EnergyPattern {
  timeOfDay: number; // hour (0-23)
  averageEnergy: number;
  variability: number;
  sampleSize: number;
}

interface ContextMetrics {
  switchCount: number;
  averageDuration: number;
  energyImpact: number;
  productivityScore: number;
}

interface ContextPrediction {
  suggestedContext: string;
  confidence: number;
  reasoning: string[];
  expectedEnergy: number;
  optimalDuration: number;
}

export class ContextTracker {
  private static readonly ENERGY_DECAY_RATE = 0.1;
  private static readonly CONTEXT_SWITCH_COST = 0.2;
  private static readonly MIN_CONTEXT_DURATION = 15; // minutes
  private static currentState: ContextState | null = null;
  private static contextHistory: ContextState[] = [];
  private static energyPatterns: Map<string, EnergyPattern[]> = new Map();

  /**
   * Start tracking a new context
   */
  static startContext(context: string, taskId?: string): ContextState {
    // Calculate switch cost if changing context
    const switchCost = this.currentState && this.currentState.currentContext !== context
      ? this.CONTEXT_SWITCH_COST
      : 0;

    // Create new context state
    const newState: ContextState = {
      currentContext: context,
      startTime: new Date(),
      energyLevel: this.currentState 
        ? Math.max(0, this.currentState.energyLevel - switchCost)
        : 1.0,
      focusLevel: this.currentState
        ? Math.max(0, this.currentState.focusLevel - switchCost)
        : 1.0,
      interruptions: 0,
      taskId
    };

    // Store previous context in history
    if (this.currentState) {
      this.contextHistory.push(this.currentState);
    }

    this.currentState = newState;
    return newState;
  }

  /**
   * Track energy levels and patterns
   */
  static trackEnergy(energyLevel: number, context: string) {
    if (!this.currentState) return;

    // Update current state
    this.currentState.energyLevel = energyLevel;

    // Update energy patterns
    const hour = new Date().getHours();
    const patterns = this.energyPatterns.get(context) || [];
    const existingPattern = patterns.find(p => p.timeOfDay === hour);

    if (existingPattern) {
      // Update existing pattern
      const n = existingPattern.sampleSize;
      existingPattern.averageEnergy = (existingPattern.averageEnergy * n + energyLevel) / (n + 1);
      existingPattern.variability = this.calculateVariability(existingPattern.averageEnergy, energyLevel, n);
      existingPattern.sampleSize++;
    } else {
      // Create new pattern
      patterns.push({
        timeOfDay: hour,
        averageEnergy: energyLevel,
        variability: 0,
        sampleSize: 1
      });
    }

    this.energyPatterns.set(context, patterns);
  }

  /**
   * Monitor context switches and their impact
   */
  static monitorContextSwitch(): ContextMetrics {
    if (!this.contextHistory.length) {
      return {
        switchCount: 0,
        averageDuration: 0,
        energyImpact: 0,
        productivityScore: 1
      };
    }

    const switches = this.contextHistory.filter((state, i) => {
      if (i === 0) return false;
      return state.currentContext !== this.contextHistory[i - 1].currentContext;
    }).length;

    const durations = this.contextHistory.map((state, i) => {
      const endTime = i === this.contextHistory.length - 1
        ? new Date()
        : this.contextHistory[i + 1].startTime;
      return (endTime.getTime() - state.startTime.getTime()) / (1000 * 60); // minutes
    });

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const energyImpact = switches * this.CONTEXT_SWITCH_COST;
    const productivityScore = Math.max(0, 1 - (energyImpact / 2));

    return {
      switchCount: switches,
      averageDuration: avgDuration,
      energyImpact,
      productivityScore
    };
  }

  /**
   * Predict optimal context for next task
   */
  static predictNextContext(task: Task): ContextPrediction {
    const hour = new Date().getHours();
    const predictions: { context: string; score: number; reasons: string[] }[] = [];

    // Analyze each potential context
    this.energyPatterns.forEach((patterns, context) => {
      const score = this.calculateContextScore(context, task, hour);
      const reasons = this.generateContextReasons(context, task, patterns);
      predictions.push({ context, score, reasons });
    });

    // Get best prediction
    const bestPrediction = predictions.reduce((a, b) => 
      a.score > b.score ? a : b
    );

    // Find optimal duration based on historical data
    const contextPatterns = this.energyPatterns.get(bestPrediction.context) || [];
    const relevantPattern = contextPatterns.find(p => p.timeOfDay === hour);
    const optimalDuration = this.calculateOptimalDuration(
      relevantPattern?.averageEnergy || 0.8,
      task
    );

    return {
      suggestedContext: bestPrediction.context,
      confidence: bestPrediction.score,
      reasoning: bestPrediction.reasons,
      expectedEnergy: relevantPattern?.averageEnergy || 0.8,
      optimalDuration
    };
  }

  /**
   * Record interruption in current context
   */
  static recordInterruption(type: string) {
    if (!this.currentState) return;

    this.currentState.interruptions++;
    this.currentState.focusLevel = Math.max(
      0,
      this.currentState.focusLevel - (this.CONTEXT_SWITCH_COST / 2)
    );
  }

  /**
   * Get current context analytics
   */
  static getContextAnalytics() {
    if (!this.currentState) return null;

    const duration = (new Date().getTime() - this.currentState.startTime.getTime()) / (1000 * 60);
    const metrics = this.monitorContextSwitch();

    return {
      currentContext: this.currentState.currentContext,
      duration,
      energyLevel: this.currentState.energyLevel,
      focusLevel: this.currentState.focusLevel,
      interruptions: this.currentState.interruptions,
      metrics
    };
  }

  private static calculateVariability(avg: number, newValue: number, n: number): number {
    return Math.sqrt(
      ((n - 1) * Math.pow(newValue - avg, 2)) / n
    );
  }

  private static calculateContextScore(
    context: string,
    task: Task,
    hour: number
  ): number {
    const patterns = this.energyPatterns.get(context) || [];
    const relevantPattern = patterns.find(p => p.timeOfDay === hour);

    const factors = [
      // Energy level match
      relevantPattern ? relevantPattern.averageEnergy : 0.5,
      
      // Context continuity (prefer current context if appropriate)
      this.currentState?.currentContext === context ? 0.2 : 0,
      
      // Task tag match
      task.tags?.includes(context) ? 0.3 : 0,
      
      // Pattern reliability
      relevantPattern ? Math.min(relevantPattern.sampleSize / 10, 0.2) : 0
    ];

    return factors.reduce((a, b) => a + b, 0);
  }

  private static generateContextReasons(
    context: string,
    task: Task,
    patterns: EnergyPattern[]
  ): string[] {
    const reasons: string[] = [];
    const hour = new Date().getHours();
    const relevantPattern = patterns.find(p => p.timeOfDay === hour);

    if (relevantPattern?.averageEnergy > 0.7) {
      reasons.push(`Historically high energy levels for ${context} at this time`);
    }

    if (task.tags?.includes(context)) {
      reasons.push(`Task tags match context ${context}`);
    }

    if (this.currentState?.currentContext === context) {
      reasons.push('Maintains current context, reducing switch cost');
    }

    if (relevantPattern?.sampleSize > 5) {
      reasons.push(`Strong historical data for ${context} context`);
    }

    return reasons;
  }

  private static calculateOptimalDuration(
    energyLevel: number,
    task: Task
  ): number {
    // Base duration on energy level and task complexity
    const baseDuration = task.timeEstimate ? task.timeEstimate * 60 : 30; // minutes
    const energyFactor = Math.max(0.5, energyLevel);
    const focusFactor = task.focusLevel ? Math.max(0.5, task.focusLevel / 100) : 0.8;

    // Adjust for optimal focus periods (25-45 minutes)
    const optimalDuration = baseDuration * (1 / energyFactor) * (1 / focusFactor);
    return Math.min(Math.max(this.MIN_CONTEXT_DURATION, optimalDuration), 45);
  }
}
