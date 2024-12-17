import { Task } from '../types/task';

export interface PriorityFactors {
  dueDate: number;        // 0-1 based on proximity to deadline
  complexity: number;     // 0-1 based on cognitive load and subtasks
  importance: number;     // 0-1 based on tags and explicit priority
  energy: number;         // 0-1 based on required energy level
  dependencies: number;   // 0-1 based on blocking tasks
}

export interface UrgencyMetrics {
  timeUrgency: number;    // How urgent based on time constraints
  impactUrgency: number;  // How urgent based on impact on other tasks
  contextUrgency: number; // How urgent based on current context
}

export class PriorityManager {
  private static readonly DECAY_RATE = 0.1;
  private static readonly URGENCY_THRESHOLD = 0.7;

  /**
   * Calculate priority factors for a task
   */
  static calculatePriorityFactors(task: Task, allTasks: Task[]): PriorityFactors {
    return {
      dueDate: this.calculateDueDateFactor(task),
      complexity: this.calculateComplexityFactor(task),
      importance: this.calculateImportanceFactor(task),
      energy: this.calculateEnergyFactor(task),
      dependencies: this.calculateDependenciesFactor(task, allTasks),
    };
  }

  /**
   * Calculate urgency metrics for a task
   */
  static calculateUrgencyMetrics(
    task: Task,
    factors: PriorityFactors,
    currentContext: { energy: number; focus: number }
  ): UrgencyMetrics {
    return {
      timeUrgency: this.calculateTimeUrgency(task, factors),
      impactUrgency: this.calculateImpactUrgency(task, factors),
      contextUrgency: this.calculateContextUrgency(task, currentContext),
    };
  }

  /**
   * Calculate the final priority score (0-1)
   */
  static calculatePriorityScore(factors: PriorityFactors, urgency: UrgencyMetrics): number {
    const baseScore = (
      factors.dueDate * 0.3 +
      factors.complexity * 0.2 +
      factors.importance * 0.2 +
      factors.energy * 0.15 +
      factors.dependencies * 0.15
    );

    const urgencyScore = (
      urgency.timeUrgency * 0.4 +
      urgency.impactUrgency * 0.3 +
      urgency.contextUrgency * 0.3
    );

    return Math.min(1, (baseScore * 0.6) + (urgencyScore * 0.4));
  }

  private static calculateDueDateFactor(task: Task): number {
    if (!task.dueDate) return 0.5;
    
    const now = new Date();
    const due = new Date(task.dueDate);
    const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDue < 0) return 1;
    if (daysUntilDue > 14) return 0.2;
    
    return 1 - (daysUntilDue / 14);
  }

  private static calculateComplexityFactor(task: Task): number {
    const subtaskComplexity = task.subtasks.length * 0.1;
    const cognitiveLoad = task.subtasks.reduce((acc, st) => acc + (st.cognitiveLoad || 0), 0) / 100;
    
    return Math.min(1, (subtaskComplexity + cognitiveLoad) / 2);
  }

  private static calculateImportanceFactor(task: Task): number {
    const priorityScore = {
      'low': 0.3,
      'medium': 0.6,
      'high': 0.9
    }[task.priority];

    const tagImportance = (task.tags || []).includes('important') ? 0.2 : 0;
    
    return Math.min(1, priorityScore + tagImportance);
  }

  private static calculateEnergyFactor(task: Task): number {
    if (!task.energyLevel) return 0.5;
    return task.energyLevel / 100;
  }

  private static calculateDependenciesFactor(task: Task, allTasks: Task[]): number {
    // TODO: Implement dependency calculation when dependency system is added
    return 0.5;
  }

  private static calculateTimeUrgency(task: Task, factors: PriorityFactors): number {
    return factors.dueDate * (1 + factors.complexity * 0.5);
  }

  private static calculateImpactUrgency(task: Task, factors: PriorityFactors): number {
    return (factors.importance + factors.dependencies) / 2;
  }

  private static calculateContextUrgency(
    task: Task,
    currentContext: { energy: number; focus: number }
  ): number {
    if (!task.energyLevel || !task.focusLevel) return 0.5;

    const energyMatch = 1 - Math.abs(task.energyLevel - currentContext.energy) / 100;
    const focusMatch = 1 - Math.abs(task.focusLevel - currentContext.focus) / 100;

    return (energyMatch + focusMatch) / 2;
  }

  /**
   * Adjust priority based on time decay and context changes
   */
  static adjustPriority(
    currentScore: number,
    lastUpdateTime: Date,
    contextChanges: number
  ): number {
    const timeSinceUpdate = (new Date().getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
    const decayFactor = Math.exp(-this.DECAY_RATE * timeSinceUpdate);
    const contextFactor = 1 + (contextChanges * 0.1);

    return Math.min(1, currentScore * decayFactor * contextFactor);
  }
}
