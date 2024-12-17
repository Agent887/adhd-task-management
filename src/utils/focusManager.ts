import { Task } from '../types/task';

interface FocusState {
  level: number; // 0-100
  status: 'deep' | 'shallow' | 'distracted' | 'recovering';
  startTime: Date;
  taskId?: string;
  interruptions: InterruptionEvent[];
}

interface InterruptionEvent {
  timestamp: Date;
  type: 'external' | 'internal' | 'context-switch' | 'break';
  duration: number; // minutes
  impact: number; // 0-1
  recovery: {
    duration: number; // minutes
    effectiveness: number; // 0-1
  };
}

interface FocusMetrics {
  deepFocusDuration: number; // minutes
  interruptionFrequency: number; // per hour
  recoveryEfficiency: number; // 0-1
  taskCompletionRate: number; // 0-1
}

interface TaskBatch {
  tasks: Task[];
  estimatedDuration: number;
  contextSwitchCost: number;
  focusRequirement: number;
  energyProfile: {
    initial: number;
    sustained: number;
    recovery: number;
  };
}

export class FocusManager {
  private static readonly DEEP_FOCUS_THRESHOLD = 80;
  private static readonly SHALLOW_FOCUS_THRESHOLD = 50;
  private static readonly MIN_DEEP_FOCUS_DURATION = 20; // minutes
  private static readonly MAX_BATCH_DURATION = 90; // minutes
  
  private static currentState: FocusState | null = null;
  private static focusHistory: FocusState[] = [];
  private static activeTaskBatch: TaskBatch | null = null;

  /**
   * Monitor focus state
   */
  static monitorFocus(
    metrics: {
      keystrokes: number;
      mouseMovement: number;
      tabSwitches: number;
      idleTime: number;
    },
    taskId?: string
  ): FocusState {
    const focusLevel = this.calculateFocusLevel(metrics);
    const status = this.determineFocusStatus(focusLevel);

    // Check for interruptions
    if (this.currentState && this.isInterruption(focusLevel, this.currentState.level)) {
      this.handleInterruption(metrics);
    }

    // Update state
    const newState: FocusState = {
      level: focusLevel,
      status,
      startTime: new Date(),
      taskId,
      interruptions: this.currentState?.interruptions || []
    };

    if (this.currentState) {
      this.focusHistory.push(this.currentState);
    }
    this.currentState = newState;

    return newState;
  }

  /**
   * Handle interruptions
   */
  static handleInterruption(metrics: any): InterruptionEvent {
    if (!this.currentState) throw new Error('No active focus state');

    const type = this.determineInterruptionType(metrics);
    const impact = this.calculateInterruptionImpact(type, this.currentState);
    const recovery = this.planRecovery(impact, this.currentState);

    const interruption: InterruptionEvent = {
      timestamp: new Date(),
      type,
      duration: 0, // Will be updated when interruption ends
      impact,
      recovery
    };

    this.currentState.interruptions.push(interruption);
    return interruption;
  }

  /**
   * Get recovery suggestions
   */
  static getRecoverySuggestions(
    interruption: InterruptionEvent,
    currentState: FocusState
  ): string[] {
    const suggestions: string[] = [];

    if (interruption.impact > 0.7) {
      suggestions.push('Take a short break (5-10 minutes) to reset focus');
      suggestions.push('Do a quick physical activity to restore energy');
    }

    if (interruption.type === 'context-switch') {
      suggestions.push('Review task objectives to re-establish context');
      suggestions.push('Write down your current thoughts before switching tasks');
    }

    if (currentState.status === 'distracted') {
      suggestions.push('Find a quieter environment if possible');
      suggestions.push('Use noise-canceling headphones or background music');
    }

    if (interruption.duration > 15) {
      suggestions.push('Break down the current task into smaller steps');
      suggestions.push('Set a timer for a focused work sprint');
    }

    return suggestions;
  }

  /**
   * Batch similar tasks
   */
  static batchTasks(tasks: Task[]): TaskBatch[] {
    const batches: TaskBatch[] = [];
    let currentBatch: Task[] = [];
    let currentDuration = 0;

    // Sort tasks by context and priority
    const sortedTasks = [...tasks].sort((a, b) => {
      // First by context
      const contextA = a.tags?.[0] || '';
      const contextB = b.tags?.[0] || '';
      if (contextA !== contextB) return contextA.localeCompare(contextB);

      // Then by priority
      return (b.priority || 0) - (a.priority || 0);
    });

    // Create batches
    for (const task of sortedTasks) {
      const taskDuration = task.timeEstimate || 0.5; // hours

      if (this.shouldStartNewBatch(currentBatch, task, currentDuration)) {
        if (currentBatch.length > 0) {
          batches.push(this.createBatch(currentBatch));
        }
        currentBatch = [task];
        currentDuration = taskDuration;
      } else {
        currentBatch.push(task);
        currentDuration += taskDuration;
      }
    }

    // Add final batch
    if (currentBatch.length > 0) {
      batches.push(this.createBatch(currentBatch));
    }

    return batches;
  }

  /**
   * Get focus analytics
   */
  static getFocusAnalytics(): FocusMetrics {
    const recentHistory = this.getRecentHistory();

    return {
      deepFocusDuration: this.calculateDeepFocusDuration(recentHistory),
      interruptionFrequency: this.calculateInterruptionFrequency(recentHistory),
      recoveryEfficiency: this.calculateRecoveryEfficiency(recentHistory),
      taskCompletionRate: this.calculateTaskCompletionRate(recentHistory)
    };
  }

  private static calculateFocusLevel(metrics: any): number {
    const weights = {
      keystrokes: 0.3,
      mouseMovement: 0.2,
      tabSwitches: -0.2,
      idleTime: -0.3
    };

    let score = 100;

    // Normalize and apply weights
    score += (metrics.keystrokes / 100) * weights.keystrokes * 100;
    score += (metrics.mouseMovement / 1000) * weights.mouseMovement * 100;
    score += (metrics.tabSwitches * weights.tabSwitches);
    score += (metrics.idleTime > 5 ? -20 : 0); // Penalty for idle time > 5 minutes

    return Math.max(0, Math.min(100, score));
  }

  private static determineFocusStatus(level: number): FocusState['status'] {
    if (level >= this.DEEP_FOCUS_THRESHOLD) return 'deep';
    if (level >= this.SHALLOW_FOCUS_THRESHOLD) return 'shallow';
    if (this.currentState?.status === 'distracted') return 'recovering';
    return 'distracted';
  }

  private static isInterruption(newLevel: number, oldLevel: number): boolean {
    return (oldLevel - newLevel) > 20;
  }

  private static determineInterruptionType(metrics: any): InterruptionEvent['type'] {
    if (metrics.tabSwitches > 5) return 'context-switch';
    if (metrics.idleTime > 5) return 'break';
    if (metrics.externalEvent) return 'external';
    return 'internal';
  }

  private static calculateInterruptionImpact(
    type: InterruptionEvent['type'],
    state: FocusState
  ): number {
    const baseImpact = {
      'external': 0.8,
      'internal': 0.6,
      'context-switch': 0.7,
      'break': 0.4
    }[type];

    const stateFactor = state.status === 'deep' ? 1.2 : 1.0;
    return Math.min(1, baseImpact * stateFactor);
  }

  private static planRecovery(
    impact: number,
    state: FocusState
  ): InterruptionEvent['recovery'] {
    const baseDuration = Math.ceil(impact * 15); // 15 minutes max recovery
    const effectiveness = state.status === 'deep' ? 0.8 : 0.6;

    return {
      duration: baseDuration,
      effectiveness
    };
  }

  private static shouldStartNewBatch(
    currentBatch: Task[],
    newTask: Task,
    currentDuration: number
  ): boolean {
    if (currentBatch.length === 0) return false;

    // Check duration limit
    if (currentDuration + (newTask.timeEstimate || 0.5) > this.MAX_BATCH_DURATION / 60) {
      return true;
    }

    // Check context compatibility
    const currentContext = currentBatch[0].tags?.[0];
    const newContext = newTask.tags?.[0];
    if (currentContext !== newContext) {
      return true;
    }

    // Check focus level compatibility
    const avgFocus = currentBatch.reduce((sum, t) => sum + (t.focusLevel || 50), 0) / currentBatch.length;
    const newFocus = newTask.focusLevel || 50;
    if (Math.abs(avgFocus - newFocus) > 20) {
      return true;
    }

    return false;
  }

  private static createBatch(tasks: Task[]): TaskBatch {
    const totalDuration = tasks.reduce((sum, t) => sum + (t.timeEstimate || 0.5), 0);
    const avgFocus = tasks.reduce((sum, t) => sum + (t.focusLevel || 50), 0) / tasks.length;
    const contextSwitchCost = this.calculateContextSwitchCost(tasks);

    return {
      tasks,
      estimatedDuration: totalDuration,
      contextSwitchCost,
      focusRequirement: avgFocus,
      energyProfile: {
        initial: 0.8,
        sustained: 0.6,
        recovery: 0.4
      }
    };
  }

  private static calculateContextSwitchCost(tasks: Task[]): number {
    const contexts = new Set(tasks.map(t => t.tags?.[0]).filter(Boolean));
    return contexts.size * 0.2; // 0.2 cost per context switch
  }

  private static getRecentHistory(): FocusState[] {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.focusHistory.filter(state => state.startTime >= hourAgo);
  }

  private static calculateDeepFocusDuration(history: FocusState[]): number {
    return history
      .filter(state => state.status === 'deep')
      .reduce((sum, state) => {
        const endTime = new Date(Math.min(
          state.startTime.getTime() + this.MIN_DEEP_FOCUS_DURATION * 60 * 1000,
          Date.now()
        ));
        return sum + (endTime.getTime() - state.startTime.getTime()) / (60 * 1000);
      }, 0);
  }

  private static calculateInterruptionFrequency(history: FocusState[]): number {
    const totalInterruptions = history.reduce(
      (sum, state) => sum + state.interruptions.length,
      0
    );
    const totalHours = history.length > 0
      ? (Date.now() - history[0].startTime.getTime()) / (60 * 60 * 1000)
      : 1;
    return totalInterruptions / totalHours;
  }

  private static calculateRecoveryEfficiency(history: FocusState[]): number {
    const recoveries = history.flatMap(state =>
      state.interruptions.map(i => i.recovery.effectiveness)
    );
    return recoveries.length > 0
      ? recoveries.reduce((sum, eff) => sum + eff, 0) / recoveries.length
      : 1;
  }

  private static calculateTaskCompletionRate(history: FocusState[]): number {
    const tasksWithFocus = history.filter(state => state.taskId).length;
    return history.length > 0 ? tasksWithFocus / history.length : 1;
  }
}
