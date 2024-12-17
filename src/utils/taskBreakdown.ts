import { Task, SubTask } from '../types/task';
import { DecisionSupport } from './decisionSupport';

interface BreakdownSuggestion {
  subtasks: SubTask[];
  estimatedTimeTotal: number;
  suggestedOrder: number[];
  difficultySpread: {
    easy: number;
    medium: number;
    hard: number;
  };
  reasoning: string[];
}

export class TaskBreakdown {
  private static readonly COMPLEXITY_THRESHOLD = 0.7;
  private static readonly MIN_SUBTASKS = 2;
  private static readonly MAX_SUBTASKS = 7; // Based on cognitive load research

  /**
   * Analyze if a task needs breakdown
   */
  static needsBreakdown(task: Task): { needs: boolean; reason: string } {
    const reasons: string[] = [];

    // Check complexity
    if (this.calculateComplexity(task) > this.COMPLEXITY_THRESHOLD) {
      reasons.push('Task is too complex');
    }

    // Check time estimate
    if (task.timeEstimate && task.timeEstimate > 4) {
      reasons.push('Task is too time-consuming');
    }

    // Check cognitive load
    if (task.focusLevel && task.focusLevel > 80) {
      reasons.push('Task requires high focus');
    }

    // Check if task has unclear steps
    if (!task.subtasks || task.subtasks.length === 0) {
      reasons.push('Task steps are not defined');
    }

    return {
      needs: reasons.length > 0,
      reason: reasons.join(', ')
    };
  }

  /**
   * Generate breakdown suggestions
   */
  static generateBreakdown(task: Task): BreakdownSuggestion {
    const subtasks: SubTask[] = [];
    let totalTime = 0;
    const reasoning: string[] = [];

    // Analyze task characteristics
    const complexity = this.calculateComplexity(task);
    const scope = this.analyzeScope(task);
    const dependencies = this.analyzeDependencies(task);

    // Generate initial subtasks based on task type
    if (task.tags?.includes('project')) {
      subtasks.push(...this.generateProjectSubtasks(task));
    } else if (task.tags?.includes('learning')) {
      subtasks.push(...this.generateLearningSubtasks(task));
    } else if (task.tags?.includes('writing')) {
      subtasks.push(...this.generateWritingSubtasks(task));
    } else {
      subtasks.push(...this.generateGenericSubtasks(task));
    }

    // Calculate time estimates
    totalTime = subtasks.reduce((acc, st) => acc + (st.estimatedDuration || 0), 0);

    // Determine optimal order
    const order = this.determineOptimalOrder(subtasks, dependencies);

    // Calculate difficulty spread
    const difficultySpread = this.calculateDifficultySpread(subtasks);

    // Generate reasoning
    reasoning.push(`Task complexity score: ${complexity.toFixed(2)}`);
    reasoning.push(`Broken down into ${subtasks.length} manageable subtasks`);
    reasoning.push(`Estimated total time: ${totalTime} hours`);
    reasoning.push(`Organized for optimal flow and context maintenance`);

    return {
      subtasks,
      estimatedTimeTotal: totalTime,
      suggestedOrder: order,
      difficultySpread,
      reasoning
    };
  }

  /**
   * Calculate task complexity
   */
  private static calculateComplexity(task: Task): number {
    const factors = [
      task.timeEstimate ? Math.min(task.timeEstimate / 8, 1) : 0.5,
      task.focusLevel ? task.focusLevel / 100 : 0.5,
      task.energyLevel ? task.energyLevel / 100 : 0.5,
      (task.tags?.length || 0) / 5,
      task.description ? task.description.length / 500 : 0
    ];

    return factors.reduce((acc, factor) => acc + factor, 0) / factors.length;
  }

  /**
   * Analyze task scope
   */
  private static analyzeScope(task: Task): {
    size: 'small' | 'medium' | 'large';
    aspects: string[];
  } {
    const aspects: string[] = [];
    let size: 'small' | 'medium' | 'large' = 'medium';

    // Analyze description
    if (task.description) {
      aspects.push(...this.extractKeyAspects(task.description));
    }

    // Analyze time requirements
    if (task.timeEstimate) {
      if (task.timeEstimate <= 2) size = 'small';
      else if (task.timeEstimate > 6) size = 'large';
    }

    // Add tags as aspects
    if (task.tags) {
      aspects.push(...task.tags);
    }

    return { size, aspects };
  }

  /**
   * Generate subtasks for project-type tasks
   */
  private static generateProjectSubtasks(task: Task): SubTask[] {
    return [
      {
        title: 'Project planning and scope definition',
        estimatedDuration: 0.5,
        cognitiveLoad: 70,
        order: 1
      },
      {
        title: 'Resource gathering and preparation',
        estimatedDuration: 0.5,
        cognitiveLoad: 50,
        order: 2
      },
      {
        title: 'Core implementation work',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.6 : 2,
        cognitiveLoad: 80,
        order: 3
      },
      {
        title: 'Testing and validation',
        estimatedDuration: 1,
        cognitiveLoad: 60,
        order: 4
      },
      {
        title: 'Documentation and cleanup',
        estimatedDuration: 0.5,
        cognitiveLoad: 40,
        order: 5
      }
    ];
  }

  /**
   * Generate subtasks for learning-type tasks
   */
  private static generateLearningSubtasks(task: Task): SubTask[] {
    return [
      {
        title: 'Overview and learning objectives',
        estimatedDuration: 0.3,
        cognitiveLoad: 40,
        order: 1
      },
      {
        title: 'Initial concept exploration',
        estimatedDuration: 0.5,
        cognitiveLoad: 60,
        order: 2
      },
      {
        title: 'Detailed study and note-taking',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.4 : 1,
        cognitiveLoad: 80,
        order: 3
      },
      {
        title: 'Practice exercises',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.4 : 1,
        cognitiveLoad: 70,
        order: 4
      },
      {
        title: 'Summary and key takeaways',
        estimatedDuration: 0.3,
        cognitiveLoad: 50,
        order: 5
      }
    ];
  }

  /**
   * Generate subtasks for writing-type tasks
   */
  private static generateWritingSubtasks(task: Task): SubTask[] {
    return [
      {
        title: 'Outline and structure',
        estimatedDuration: 0.5,
        cognitiveLoad: 60,
        order: 1
      },
      {
        title: 'Research and gathering info',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.3 : 1,
        cognitiveLoad: 70,
        order: 2
      },
      {
        title: 'First draft',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.4 : 1.5,
        cognitiveLoad: 80,
        order: 3
      },
      {
        title: 'Review and revisions',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.2 : 0.5,
        cognitiveLoad: 60,
        order: 4
      },
      {
        title: 'Final polish',
        estimatedDuration: 0.3,
        cognitiveLoad: 40,
        order: 5
      }
    ];
  }

  /**
   * Generate subtasks for generic tasks
   */
  private static generateGenericSubtasks(task: Task): SubTask[] {
    return [
      {
        title: 'Initial setup and preparation',
        estimatedDuration: 0.3,
        cognitiveLoad: 40,
        order: 1
      },
      {
        title: 'Main task work',
        estimatedDuration: task.timeEstimate ? task.timeEstimate * 0.7 : 1,
        cognitiveLoad: 70,
        order: 2
      },
      {
        title: 'Review and completion',
        estimatedDuration: 0.3,
        cognitiveLoad: 50,
        order: 3
      }
    ];
  }

  /**
   * Analyze task dependencies
   */
  private static analyzeDependencies(task: Task): {
    internal: string[];
    external: string[];
  } {
    return {
      internal: [], // Will be filled when dependency system is implemented
      external: task.dependencies || []
    };
  }

  /**
   * Determine optimal order for subtasks
   */
  private static determineOptimalOrder(subtasks: SubTask[], dependencies: any): number[] {
    // Sort by cognitive load to distribute effort
    const sortedTasks = [...subtasks].sort((a, b) => {
      // Prioritize setup/preparation tasks
      if (a.title.toLowerCase().includes('setup') || a.title.toLowerCase().includes('preparation')) return -1;
      if (b.title.toLowerCase().includes('setup') || b.title.toLowerCase().includes('preparation')) return 1;

      // Then sort by cognitive load, alternating between high and low
      const aLoad = a.cognitiveLoad || 50;
      const bLoad = b.cognitiveLoad || 50;
      return aLoad - bLoad;
    });

    return sortedTasks.map((_, index) => index + 1);
  }

  /**
   * Calculate difficulty spread of subtasks
   */
  private static calculateDifficultySpread(subtasks: SubTask[]): {
    easy: number;
    medium: number;
    hard: number;
  } {
    const result = {
      easy: 0,
      medium: 0,
      hard: 0
    };

    subtasks.forEach(subtask => {
      const load = subtask.cognitiveLoad || 50;
      if (load < 40) result.easy++;
      else if (load < 70) result.medium++;
      else result.hard++;
    });

    return result;
  }

  /**
   * Extract key aspects from text
   */
  private static extractKeyAspects(text: string): string[] {
    // Simple keyword extraction
    const keywords = text.toLowerCase()
      .split(/[\s,.-]+/)
      .filter(word => word.length > 3)
      .filter(word => !['and', 'the', 'for', 'with'].includes(word));

    return [...new Set(keywords)].slice(0, 5);
  }
}
