import { UserMetrics } from '../types/task';

interface UIState {
  complexity: 'minimal' | 'balanced' | 'detailed';
  layout: 'focused' | 'split' | 'dashboard';
  colorScheme: 'calm' | 'energetic' | 'neutral';
  animations: 'none' | 'subtle' | 'dynamic';
  density: 'compact' | 'comfortable' | 'spacious';
}

interface UIElement {
  id: string;
  type: 'button' | 'card' | 'list' | 'input' | 'navigation';
  priority: number;
  usage: number;
  lastUsed: Date;
  position: {
    section: string;
    order: number;
  };
}

interface AdaptationRule {
  condition: (metrics: UserMetrics, currentState: UIState) => boolean;
  adaptation: (currentState: UIState) => Partial<UIState>;
  priority: number;
  description: string;
}

interface UsagePattern {
  element: string;
  frequency: number;
  timeOfDay: number;
  context: string;
  success: number;
}

export class AdaptiveInterface {
  private static currentState: UIState = {
    complexity: 'balanced',
    layout: 'focused',
    colorScheme: 'neutral',
    animations: 'subtle',
    density: 'comfortable'
  };

  private static elements: Map<string, UIElement> = new Map();
  private static usagePatterns: UsagePattern[] = [];
  private static adaptationRules: AdaptationRule[] = [];

  /**
   * Initialize adaptive interface
   */
  static initialize(userPreferences: Partial<UIState>): void {
    this.currentState = { ...this.currentState, ...userPreferences };
    this.setupDefaultRules();
    this.setupDefaultElements();
  }

  /**
   * Adapt interface based on user metrics
   */
  static adapt(metrics: UserMetrics): UIState {
    // Apply adaptation rules
    const applicableRules = this.adaptationRules
      .filter(rule => rule.condition(metrics, this.currentState))
      .sort((a, b) => b.priority - a.priority);

    // Apply adaptations
    applicableRules.forEach(rule => {
      const adaptation = rule.adaptation(this.currentState);
      this.currentState = { ...this.currentState, ...adaptation };
    });

    // Optimize element positions
    this.optimizeElementPositions(metrics);

    return this.currentState;
  }

  /**
   * Track UI element usage
   */
  static trackElementUsage(
    elementId: string,
    context: string,
    success: boolean
  ): void {
    const element = this.elements.get(elementId);
    if (!element) return;

    // Update element usage
    element.usage++;
    element.lastUsed = new Date();

    // Update usage pattern
    const hour = new Date().getHours();
    const pattern = this.usagePatterns.find(
      p => p.element === elementId && p.timeOfDay === hour && p.context === context
    );

    if (pattern) {
      pattern.frequency++;
      pattern.success = (pattern.success * (pattern.frequency - 1) + (success ? 1 : 0)) / pattern.frequency;
    } else {
      this.usagePatterns.push({
        element: elementId,
        frequency: 1,
        timeOfDay: hour,
        context,
        success: success ? 1 : 0
      });
    }
  }

  /**
   * Get optimized layout
   */
  static getOptimizedLayout(
    metrics: UserMetrics,
    context: string
  ): {
    elements: UIElement[];
    state: UIState;
  } {
    const state = this.adapt(metrics);
    const elements = this.getOptimizedElements(context);

    return { elements, state };
  }

  private static setupDefaultRules(): void {
    this.adaptationRules = [
      {
        condition: (metrics) => metrics.focusLevel < 30,
        adaptation: () => ({
          complexity: 'minimal',
          animations: 'none',
          density: 'spacious'
        }),
        priority: 3,
        description: 'Simplify interface when focus is low'
      },
      {
        condition: (metrics) => metrics.energyLevel < 40,
        adaptation: () => ({
          colorScheme: 'energetic',
          animations: 'dynamic'
        }),
        priority: 2,
        description: 'Increase visual engagement when energy is low'
      },
      {
        condition: (metrics) => metrics.taskCount > 5,
        adaptation: () => ({
          layout: 'dashboard',
          density: 'compact'
        }),
        priority: 1,
        description: 'Switch to dashboard layout when managing many tasks'
      }
    ];
  }

  private static setupDefaultElements(): void {
    const defaultElements: UIElement[] = [
      {
        id: 'quick-add',
        type: 'button',
        priority: 90,
        usage: 0,
        lastUsed: new Date(),
        position: { section: 'header', order: 1 }
      },
      {
        id: 'task-list',
        type: 'list',
        priority: 85,
        usage: 0,
        lastUsed: new Date(),
        position: { section: 'main', order: 1 }
      },
      {
        id: 'context-switch',
        type: 'navigation',
        priority: 80,
        usage: 0,
        lastUsed: new Date(),
        position: { section: 'sidebar', order: 1 }
      }
    ];

    defaultElements.forEach(element => {
      this.elements.set(element.id, element);
    });
  }

  private static optimizeElementPositions(metrics: UserMetrics): void {
    // Get frequently used elements for current time and context
    const hour = new Date().getHours();
    const relevantPatterns = this.usagePatterns.filter(
      p => p.timeOfDay === hour && p.success > 0.7
    );

    // Update element priorities based on patterns
    relevantPatterns.forEach(pattern => {
      const element = this.elements.get(pattern.element);
      if (element) {
        element.priority = this.calculateElementPriority(element, pattern, metrics);
      }
    });

    // Reorganize elements based on new priorities
    this.reorganizeElements();
  }

  private static calculateElementPriority(
    element: UIElement,
    pattern: UsagePattern,
    metrics: UserMetrics
  ): number {
    const baseScore = element.priority;
    const usageScore = pattern.frequency * 10;
    const successScore = pattern.success * 20;
    const recencyScore = this.calculateRecencyScore(element.lastUsed);
    const contextScore = this.calculateContextScore(pattern.context, metrics);

    return Math.min(100, (
      baseScore * 0.3 +
      usageScore * 0.2 +
      successScore * 0.2 +
      recencyScore * 0.15 +
      contextScore * 0.15
    ));
  }

  private static calculateRecencyScore(lastUsed: Date): number {
    const hoursSinceUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
    return Math.max(0, 100 - (hoursSinceUse * 2));
  }

  private static calculateContextScore(context: string, metrics: UserMetrics): number {
    // This would be implemented based on context relevance to current metrics
    return 50;
  }

  private static reorganizeElements(): void {
    const sections = new Map<string, UIElement[]>();

    // Group elements by section
    this.elements.forEach(element => {
      const sectionElements = sections.get(element.position.section) || [];
      sectionElements.push(element);
      sections.set(element.position.section, sectionElements);
    });

    // Sort elements within each section
    sections.forEach(sectionElements => {
      sectionElements.sort((a, b) => b.priority - a.priority);
      
      // Update order
      sectionElements.forEach((element, index) => {
        element.position.order = index + 1;
      });
    });
  }

  private static getOptimizedElements(context: string): UIElement[] {
    const elements = Array.from(this.elements.values());
    const hour = new Date().getHours();

    return elements.sort((a, b) => {
      const aPattern = this.usagePatterns.find(
        p => p.element === a.id && p.timeOfDay === hour && p.context === context
      );
      const bPattern = this.usagePatterns.find(
        p => p.element === b.id && p.timeOfDay === hour && p.context === context
      );

      const aScore = aPattern ? aPattern.frequency * aPattern.success : 0;
      const bScore = bPattern ? bPattern.frequency * bPattern.success : 0;

      return bScore - aScore;
    });
  }
}
