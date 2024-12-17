import { Task, UserMetrics } from '../types/task';

interface ComplexityScore {
  overall: number;
  components: {
    cognitive: number;
    temporal: number;
    emotional: number;
    contextual: number;
  };
  adjustments: {
    timeOfDay: number;
    energyLevel: number;
    recentPerformance: number;
  };
}

interface UserCapacity {
  currentLoad: number;
  maxLoad: number;
  optimalTaskCount: number;
  energyLevel: number;
  focusLevel: number;
  timeOfDayEfficiency: number;
}

export class ComplexityManager {
  private static readonly COGNITIVE_WEIGHT = 0.35;
  private static readonly TEMPORAL_WEIGHT = 0.25;
  private static readonly EMOTIONAL_WEIGHT = 0.20;
  private static readonly CONTEXTUAL_WEIGHT = 0.20;

  /**
   * Calculate complexity score for a task
   */
  static calculateComplexityScore(task: Task, userMetrics: UserMetrics): ComplexityScore {
    const components = this.calculateComponents(task);
    const adjustments = this.calculateAdjustments(userMetrics);

    const overall = this.calculateOverallScore(components, adjustments);

    return {
      overall,
      components,
      adjustments
    };
  }

  /**
   * Track and update user capacity
   */
  static trackUserCapacity(
    currentTasks: Task[],
    userMetrics: UserMetrics
  ): UserCapacity {
    const currentLoad = this.calculateCurrentLoad(currentTasks);
    const maxLoad = this.calculateMaxLoad(userMetrics);
    const optimalTaskCount = this.calculateOptimalTaskCount(userMetrics);
    
    return {
      currentLoad,
      maxLoad,
      optimalTaskCount,
      energyLevel: userMetrics.energyLevel,
      focusLevel: userMetrics.focusLevel,
      timeOfDayEfficiency: this.calculateTimeEfficiency(new Date())
    };
  }

  /**
   * Adjust complexity based on feedback
   */
  static adjustComplexity(
    task: Task,
    feedback: {
      actualDuration: number;
      perceivedDifficulty: number;
      energyDrain: number;
      contextSwitches: number;
    }
  ): Task {
    const adjustedTask = { ...task };

    // Adjust time estimate based on actual duration
    if (adjustedTask.timeEstimate) {
      const timeAdjustment = (feedback.actualDuration - adjustedTask.timeEstimate) / 2;
      adjustedTask.timeEstimate += timeAdjustment;
    }

    // Adjust focus level based on perceived difficulty
    if (adjustedTask.focusLevel) {
      const focusAdjustment = (feedback.perceivedDifficulty - adjustedTask.focusLevel) / 2;
      adjustedTask.focusLevel += focusAdjustment;
    }

    // Adjust energy level based on energy drain
    if (adjustedTask.energyLevel) {
      const energyAdjustment = (feedback.energyDrain - adjustedTask.energyLevel) / 2;
      adjustedTask.energyLevel += energyAdjustment;
    }

    // Update context switching impact
    adjustedTask.contextSwitchImpact = feedback.contextSwitches;

    return adjustedTask;
  }

  /**
   * Calculate optimization suggestions
   */
  static getOptimizationSuggestions(
    tasks: Task[],
    userCapacity: UserCapacity
  ): {
    switchReduction: string[];
    energyOptimization: string[];
    productivityBoost: string[];
  } {
    return {
      switchReduction: this.getSwitchReductionSuggestions(tasks),
      energyOptimization: this.getEnergyOptimizationSuggestions(tasks, userCapacity),
      productivityBoost: this.getProductivitySuggestions(tasks, userCapacity)
    };
  }

  private static calculateComponents(task: Task) {
    return {
      cognitive: this.calculateCognitiveComplexity(task),
      temporal: this.calculateTemporalComplexity(task),
      emotional: this.calculateEmotionalComplexity(task),
      contextual: this.calculateContextualComplexity(task)
    };
  }

  private static calculateCognitiveComplexity(task: Task): number {
    const factors = [
      task.focusLevel ? task.focusLevel / 100 : 0.5,
      task.subtasks ? Math.min(task.subtasks.length / 5, 1) : 0.3,
      task.dependencies ? Math.min(task.dependencies.length / 3, 1) : 0.2
    ];

    return factors.reduce((acc, factor) => acc + factor, 0) / factors.length;
  }

  private static calculateTemporalComplexity(task: Task): number {
    const factors = [
      task.timeEstimate ? Math.min(task.timeEstimate / 8, 1) : 0.5,
      task.dueDate ? this.calculateUrgency(task.dueDate) : 0.3
    ];

    return factors.reduce((acc, factor) => acc + factor, 0) / factors.length;
  }

  private static calculateEmotionalComplexity(task: Task): number {
    const factors = [
      task.energyLevel ? task.energyLevel / 100 : 0.5,
      task.tags?.includes('high-stress') ? 1 : 0.3,
      task.priority ? task.priority / 100 : 0.5
    ];

    return factors.reduce((acc, factor) => acc + factor, 0) / factors.length;
  }

  private static calculateContextualComplexity(task: Task): number {
    const factors = [
      task.contextSwitchImpact ? task.contextSwitchImpact / 5 : 0.3,
      task.dependencies ? Math.min(task.dependencies.length / 3, 1) : 0.2
    ];

    return factors.reduce((acc, factor) => acc + factor, 0) / factors.length;
  }

  private static calculateAdjustments(userMetrics: UserMetrics) {
    return {
      timeOfDay: this.calculateTimeEfficiency(new Date()),
      energyLevel: userMetrics.energyLevel / 100,
      recentPerformance: userMetrics.recentTaskCompletion || 0.5
    };
  }

  private static calculateTimeEfficiency(now: Date): number {
    const hour = now.getHours();
    
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

  private static calculateOverallScore(
    components: ComplexityScore['components'],
    adjustments: ComplexityScore['adjustments']
  ): number {
    const baseScore = 
      components.cognitive * this.COGNITIVE_WEIGHT +
      components.temporal * this.TEMPORAL_WEIGHT +
      components.emotional * this.EMOTIONAL_WEIGHT +
      components.contextual * this.CONTEXTUAL_WEIGHT;

    const adjustmentFactor = 
      (adjustments.timeOfDay +
       adjustments.energyLevel +
       adjustments.recentPerformance) / 3;

    return baseScore * adjustmentFactor;
  }

  private static calculateCurrentLoad(tasks: Task[]): number {
    return tasks.reduce((total, task) => {
      const complexity = this.calculateComponents(task);
      return total + this.calculateOverallScore(complexity, {
        timeOfDay: 1,
        energyLevel: 1,
        recentPerformance: 1
      });
    }, 0);
  }

  private static calculateMaxLoad(userMetrics: UserMetrics): number {
    const baseLoad = 5; // Base number of concurrent tasks
    const adjustments = [
      userMetrics.energyLevel / 100,
      userMetrics.focusLevel / 100,
      userMetrics.recentTaskCompletion || 0.5
    ];

    return baseLoad * (adjustments.reduce((acc, adj) => acc + adj, 0) / adjustments.length);
  }

  private static calculateOptimalTaskCount(userMetrics: UserMetrics): number {
    const maxLoad = this.calculateMaxLoad(userMetrics);
    return Math.max(1, Math.floor(maxLoad * 0.8)); // 80% of max load
  }

  private static calculateUrgency(dueDate: Date): number {
    const now = new Date();
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue <= 0) return 1;
    if (daysUntilDue <= 1) return 0.9;
    if (daysUntilDue <= 3) return 0.7;
    if (daysUntilDue <= 7) return 0.5;
    return 0.3;
  }

  private static getSwitchReductionSuggestions(tasks: Task[]): string[] {
    const suggestions: string[] = [];
    const tasksByContext = this.groupTasksByContext(tasks);

    if (Object.keys(tasksByContext).length > 3) {
      suggestions.push('Consider batching tasks from similar contexts together');
    }

    if (tasks.some(t => t.contextSwitchImpact && t.contextSwitchImpact > 3)) {
      suggestions.push('High-impact context switches detected. Try to complete these tasks in dedicated time blocks');
    }

    return suggestions;
  }

  private static getEnergyOptimizationSuggestions(
    tasks: Task[],
    userCapacity: UserCapacity
  ): string[] {
    const suggestions: string[] = [];

    if (userCapacity.energyLevel < 0.5) {
      suggestions.push('Energy levels are low. Focus on low-energy tasks or take a break');
    }

    const highEnergyTasks = tasks.filter(t => t.energyLevel && t.energyLevel > 70);
    if (highEnergyTasks.length > 2) {
      suggestions.push('Multiple high-energy tasks detected. Space them out throughout the day');
    }

    return suggestions;
  }

  private static getProductivitySuggestions(
    tasks: Task[],
    userCapacity: UserCapacity
  ): string[] {
    const suggestions: string[] = [];

    if (tasks.length > userCapacity.optimalTaskCount) {
      suggestions.push(`Consider reducing active tasks from ${tasks.length} to ${userCapacity.optimalTaskCount} for optimal focus`);
    }

    if (userCapacity.currentLoad > userCapacity.maxLoad) {
      suggestions.push('Current workload exceeds capacity. Consider deferring or delegating some tasks');
    }

    return suggestions;
  }

  private static groupTasksByContext(tasks: Task[]): Record<string, Task[]> {
    return tasks.reduce((groups: Record<string, Task[]>, task) => {
      const context = task.tags?.[0] || 'uncategorized';
      if (!groups[context]) {
        groups[context] = [];
      }
      groups[context].push(task);
      return groups;
    }, {});
  }
}
