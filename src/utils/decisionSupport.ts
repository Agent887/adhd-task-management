import { Task } from '../types/task';
import { PriorityManager } from './priorityManager';

export interface Option {
  id: string;
  taskId: string;
  description: string;
  pros: string[];
  cons: string[];
  impact: number;        // -1 to 1
  effort: number;        // 0 to 1
  confidence: number;    // 0 to 1
  timeframe: number;     // estimated hours
}

export interface Consequence {
  description: string;
  probability: number;   // 0 to 1
  impact: number;       // -1 to 1
  timeframe: string;    // immediate, short-term, long-term
  affectedTasks: string[];
}

export interface Recommendation {
  optionId: string;
  confidence: number;
  reasoning: string[];
  suggestedApproach: string;
  alternativeSuggestions?: string[];
}

export class DecisionSupport {
  /**
   * Analyze options for a task
   */
  static analyzeOptions(task: Task, allTasks: Task[]): Option[] {
    const options: Option[] = [];
    
    // Option 1: Do it now
    options.push(this.analyzeDoItNowOption(task, allTasks));
    
    // Option 2: Defer
    options.push(this.analyzeDeferOption(task, allTasks));
    
    // Option 3: Break down
    if (task.subtasks.length === 0) {
      options.push(this.analyzeBreakDownOption(task));
    }
    
    // Option 4: Delegate
    options.push(this.analyzeDelegateOption(task));
    
    return options;
  }

  /**
   * Predict consequences of each option
   */
  static predictConsequences(task: Task, option: Option, allTasks: Task[]): Consequence[] {
    const consequences: Consequence[] = [];
    
    // Time impact consequences
    consequences.push(this.analyzeTimeImpact(task, option, allTasks));
    
    // Energy impact consequences
    consequences.push(this.analyzeEnergyImpact(task, option));
    
    // Dependency impact consequences
    consequences.push(this.analyzeDependencyImpact(task, option, allTasks));
    
    // Context switch consequences
    consequences.push(this.analyzeContextSwitchImpact(task, option, allTasks));
    
    return consequences;
  }

  /**
   * Generate recommendations based on analysis
   */
  static generateRecommendation(
    task: Task,
    options: Option[],
    consequences: Consequence[],
    currentContext: { energy: number; focus: number }
  ): Recommendation {
    const scores = options.map(option => {
      const optionConsequences = consequences.filter(c => 
        c.affectedTasks.includes(task.id)
      );
      
      return {
        optionId: option.id,
        score: this.calculateOptionScore(option, optionConsequences, currentContext),
        consequences: optionConsequences
      };
    });
    
    const bestOption = scores.reduce((a, b) => 
      a.score > b.score ? a : b
    );
    
    return {
      optionId: bestOption.optionId,
      confidence: this.calculateConfidence(bestOption.score, bestOption.consequences),
      reasoning: this.generateReasoning(bestOption, task),
      suggestedApproach: this.generateApproach(bestOption, task),
      alternativeSuggestions: this.generateAlternatives(scores, task)
    };
  }

  private static analyzeDoItNowOption(task: Task, allTasks: Task[]): Option {
    const impact = this.calculateImmediateImpact(task, allTasks);
    const effort = task.timeEstimate ? task.timeEstimate / 8 : 0.5; // Normalize to 0-1 scale
    
    return {
      id: 'do-it-now',
      taskId: task.id,
      description: 'Complete the task now',
      pros: [
        'Immediate progress',
        'Reduces mental load',
        'Prevents task from becoming more urgent'
      ],
      cons: [
        effort > 0.7 ? 'Requires significant effort' : '',
        impact < 0 ? 'May impact other tasks negatively' : ''
      ].filter(Boolean),
      impact,
      effort,
      confidence: 0.9,
      timeframe: task.timeEstimate || 1
    };
  }

  private static analyzeDeferOption(task: Task, allTasks: Task[]): Option {
    const dueDate = new Date(task.dueDate);
    const timeUntilDue = (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    return {
      id: 'defer',
      taskId: task.id,
      description: 'Defer the task for later',
      pros: [
        'Allows focus on more urgent tasks',
        'Can be done when energy levels are better',
        'More time for preparation'
      ],
      cons: [
        timeUntilDue < 24 ? 'Due date is approaching' : '',
        'Risk of increased urgency',
        'May create future scheduling conflicts'
      ].filter(Boolean),
      impact: -0.2,
      effort: 0.1,
      confidence: 0.7,
      timeframe: task.timeEstimate || 1
    };
  }

  private static analyzeBreakDownOption(task: Task): Option {
    return {
      id: 'break-down',
      taskId: task.id,
      description: 'Break down into smaller subtasks',
      pros: [
        'Makes the task more manageable',
        'Easier to estimate time and effort',
        'Can be done incrementally'
      ],
      cons: [
        'Initial overhead in planning',
        'May reveal hidden complexity'
      ],
      impact: 0.5,
      effort: 0.3,
      confidence: 0.8,
      timeframe: 0.5
    };
  }

  private static analyzeDelegateOption(task: Task): Option {
    return {
      id: 'delegate',
      taskId: task.id,
      description: 'Delegate or seek help',
      pros: [
        'Reduces personal workload',
        'Can leverage others\' expertise',
        'Parallel progress possible'
      ],
      cons: [
        'Requires clear communication',
        'May need follow-up and monitoring',
        'Dependent on others\' availability'
      ],
      impact: 0.3,
      effort: 0.4,
      confidence: 0.6,
      timeframe: task.timeEstimate ? task.timeEstimate * 1.2 : 1.2
    };
  }

  private static analyzeTimeImpact(task: Task, option: Option, allTasks: Task[]): Consequence {
    const affectedTasks = allTasks.filter(t => 
      t.dependencies?.includes(task.id) || task.dependencies?.includes(t.id)
    );
    
    return {
      description: `Impact on schedule and deadlines`,
      probability: 0.8,
      impact: option.timeframe > 4 ? -0.5 : 0.3,
      timeframe: option.timeframe > 4 ? 'long-term' : 'short-term',
      affectedTasks: affectedTasks.map(t => t.id)
    };
  }

  private static analyzeEnergyImpact(task: Task, option: Option): Consequence {
    return {
      description: `Impact on energy levels`,
      probability: 0.9,
      impact: -(option.effort * 0.7),
      timeframe: 'immediate',
      affectedTasks: [task.id]
    };
  }

  private static analyzeDependencyImpact(task: Task, option: Option, allTasks: Task[]): Consequence {
    const blockedTasks = allTasks.filter(t => t.dependencies?.includes(task.id));
    
    return {
      description: `Impact on dependent tasks`,
      probability: 0.7,
      impact: blockedTasks.length > 0 ? 0.6 : 0,
      timeframe: blockedTasks.length > 0 ? 'short-term' : 'long-term',
      affectedTasks: blockedTasks.map(t => t.id)
    };
  }

  private static analyzeContextSwitchImpact(task: Task, option: Option, allTasks: Task[]): Consequence {
    const currentContextTasks = allTasks.filter(t => 
      t.tags?.some(tag => task.tags?.includes(tag))
    );
    
    return {
      description: `Impact on context switching`,
      probability: 0.8,
      impact: currentContextTasks.length > 0 ? 0.4 : -0.2,
      timeframe: 'immediate',
      affectedTasks: currentContextTasks.map(t => t.id)
    };
  }

  private static calculateImmediateImpact(task: Task, allTasks: Task[]): number {
    const priorityFactors = PriorityManager.calculatePriorityFactors(task, allTasks);
    return (
      priorityFactors.importance * 0.4 +
      priorityFactors.dependencies * 0.3 +
      priorityFactors.dueDate * 0.3
    );
  }

  private static calculateOptionScore(
    option: Option,
    consequences: Consequence[],
    currentContext: { energy: number; focus: number }
  ): number {
    const impactScore = consequences.reduce((acc, c) => 
      acc + (c.impact * c.probability), 0
    ) / consequences.length;
    
    const energyFit = 1 - (option.effort - (currentContext.energy / 100));
    const confidenceWeight = option.confidence;
    
    return (
      impactScore * 0.4 +
      energyFit * 0.3 +
      confidenceWeight * 0.3
    );
  }

  private static calculateConfidence(score: number, consequences: Consequence[]): number {
    const avgProbability = consequences.reduce((acc, c) => 
      acc + c.probability, 0
    ) / consequences.length;
    
    return Math.min(1, (score + avgProbability) / 2);
  }

  private static generateReasoning(
    option: { optionId: string; score: number; consequences: Consequence[] },
    task: Task
  ): string[] {
    const reasoning: string[] = [];
    
    // Add score-based reasoning
    if (option.score > 0.7) {
      reasoning.push('This option has a high probability of success');
    }
    
    // Add consequence-based reasoning
    const positiveConsequences = option.consequences.filter(c => c.impact > 0);
    const negativeConsequences = option.consequences.filter(c => c.impact < 0);
    
    if (positiveConsequences.length > 0) {
      reasoning.push(`Positive impacts: ${positiveConsequences.map(c => c.description).join(', ')}`);
    }
    
    if (negativeConsequences.length > 0) {
      reasoning.push(`Consider these risks: ${negativeConsequences.map(c => c.description).join(', ')}`);
    }
    
    return reasoning;
  }

  private static generateApproach(
    option: { optionId: string; score: number; consequences: Consequence[] },
    task: Task
  ): string {
    switch (option.optionId) {
      case 'do-it-now':
        return `Start with the most straightforward aspect of "${task.title}" to build momentum`;
      case 'defer':
        return `Schedule "${task.title}" for a more optimal time when energy levels align better`;
      case 'break-down':
        return `Begin by identifying 2-3 concrete subtasks for "${task.title}"`;
      case 'delegate':
        return `Create clear instructions and success criteria for "${task.title}"`;
      default:
        return `Proceed with the selected approach for "${task.title}"`;
    }
  }

  private static generateAlternatives(
    scores: { optionId: string; score: number }[],
    task: Task
  ): string[] {
    return scores
      .filter(s => s.score > 0.4)
      .map(s => {
        switch (s.optionId) {
          case 'do-it-now':
            return 'Consider immediate action if energy levels are good';
          case 'defer':
            return 'Could be deferred if other priorities are more pressing';
          case 'break-down':
            return 'Breaking down the task might make it more manageable';
          case 'delegate':
            return 'Delegation could be an option to consider';
          default:
            return '';
        }
      })
      .filter(Boolean);
  }
}
