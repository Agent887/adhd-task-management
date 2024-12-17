import { Task } from '../types/task';

interface ContextCategory {
  id: string;
  name: string;
  description: string;
  type: 'project' | 'area' | 'resource' | 'energy' | 'location';
  attributes: {
    focusRequired: number; // 0-100
    energyDemand: number; // 0-100
    contextSwitchCost: number; // 0-100
    timeboxPreference: number; // minutes
  };
  relationships: CategoryRelationship[];
  stats: CategoryStats;
}

interface CategoryRelationship {
  targetId: string;
  type: 'complements' | 'conflicts' | 'precedes' | 'enables' | 'similar';
  strength: number; // 0-1
  impact: {
    productivity: number; // -1 to 1
    energy: number; // -1 to 1
    focus: number; // -1 to 1
  };
}

interface CategoryStats {
  taskCount: number;
  averageCompletion: number;
  averageDuration: number;
  successRate: number;
  peakTimeOfDay: number; // hour 0-23
  commonPairings: string[]; // category IDs
}

interface OptimizationResult {
  categorySequence: string[];
  switchCosts: number[];
  energyProfile: number[];
  focusProfile: number[];
  recommendations: string[];
}

export class ContextCategories {
  private static categories: Map<string, ContextCategory> = new Map();
  private static readonly DEFAULT_ATTRIBUTES = {
    focusRequired: 50,
    energyDemand: 50,
    contextSwitchCost: 50,
    timeboxPreference: 30
  };

  /**
   * Define or update a context category
   */
  static defineCategory(
    id: string,
    params: Partial<ContextCategory>
  ): ContextCategory {
    const existing = this.categories.get(id);
    const category: ContextCategory = {
      id,
      name: params.name || id,
      description: params.description || '',
      type: params.type || 'area',
      attributes: {
        ...this.DEFAULT_ATTRIBUTES,
        ...(params.attributes || {})
      },
      relationships: params.relationships || [],
      stats: params.stats || {
        taskCount: 0,
        averageCompletion: 0,
        averageDuration: 0,
        successRate: 0,
        peakTimeOfDay: 9,
        commonPairings: []
      }
    };

    this.categories.set(id, category);
    return category;
  }

  /**
   * Map relationships between categories
   */
  static mapRelationships(
    categoryId: string,
    relationships: CategoryRelationship[]
  ): void {
    const category = this.categories.get(categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);

    // Update relationships
    category.relationships = relationships;

    // Create reciprocal relationships
    relationships.forEach(rel => {
      const target = this.categories.get(rel.targetId);
      if (!target) return;

      const reciprocal = this.getReciprocalRelationship(rel);
      const existingIndex = target.relationships.findIndex(
        r => r.targetId === categoryId
      );

      if (existingIndex >= 0) {
        target.relationships[existingIndex] = reciprocal;
      } else {
        target.relationships.push(reciprocal);
      }
    });
  }

  /**
   * Calculate impact scores for category combinations
   */
  static calculateImpactScores(
    categories: string[]
  ): {
    productivity: number;
    energy: number;
    focus: number;
    switchCost: number;
  } {
    let totalProductivity = 0;
    let totalEnergy = 0;
    let totalFocus = 0;
    let totalSwitchCost = 0;
    let count = 0;

    // Calculate pairwise impacts
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const impact = this.calculatePairImpact(categories[i], categories[j]);
        if (impact) {
          totalProductivity += impact.productivity;
          totalEnergy += impact.energy;
          totalFocus += impact.focus;
          totalSwitchCost += this.calculateSwitchCost(categories[i], categories[j]);
          count++;
        }
      }
    }

    if (count === 0) return { productivity: 0, energy: 0, focus: 0, switchCost: 0 };

    return {
      productivity: totalProductivity / count,
      energy: totalEnergy / count,
      focus: totalFocus / count,
      switchCost: totalSwitchCost / count
    };
  }

  /**
   * Generate optimization suggestions
   */
  static optimizeContextFlow(
    tasks: Task[],
    userEnergy: number,
    timeOfDay: number
  ): OptimizationResult {
    const categories = this.extractCategories(tasks);
    const sequence = this.findOptimalSequence(categories, userEnergy, timeOfDay);
    
    const switchCosts = this.calculateSequenceSwitchCosts(sequence);
    const energyProfile = this.calculateEnergyProfile(sequence, userEnergy);
    const focusProfile = this.calculateFocusProfile(sequence);
    
    return {
      categorySequence: sequence,
      switchCosts,
      energyProfile,
      focusProfile,
      recommendations: this.generateOptimizationRecommendations(
        sequence,
        switchCosts,
        energyProfile,
        focusProfile
      )
    };
  }

  /**
   * Update category statistics
   */
  static updateCategoryStats(
    categoryId: string,
    task: Task,
    completed: boolean,
    duration: number
  ): void {
    const category = this.categories.get(categoryId);
    if (!category) return;

    const stats = category.stats;
    const n = stats.taskCount;

    // Update running averages
    stats.taskCount++;
    stats.averageCompletion = (stats.averageCompletion * n + (completed ? 1 : 0)) / (n + 1);
    stats.averageDuration = (stats.averageDuration * n + duration) / (n + 1);
    stats.successRate = (stats.successRate * n + (completed ? 1 : 0)) / (n + 1);

    // Update peak time
    const taskHour = new Date().getHours();
    if (completed) {
      stats.peakTimeOfDay = Math.round((stats.peakTimeOfDay * n + taskHour) / (n + 1));
    }

    // Update common pairings
    if (task.tags) {
      task.tags.forEach(tag => {
        if (tag !== categoryId && !stats.commonPairings.includes(tag)) {
          stats.commonPairings.push(tag);
          if (stats.commonPairings.length > 5) {
            stats.commonPairings.shift();
          }
        }
      });
    }
  }

  private static getReciprocalRelationship(
    rel: CategoryRelationship
  ): CategoryRelationship {
    const reciprocalTypes: Record<CategoryRelationship['type'], CategoryRelationship['type']> = {
      complements: 'complements',
      conflicts: 'conflicts',
      precedes: 'enables',
      enables: 'precedes',
      similar: 'similar'
    };

    return {
      targetId: rel.targetId,
      type: reciprocalTypes[rel.type],
      strength: rel.strength,
      impact: {
        productivity: rel.impact.productivity,
        energy: rel.impact.energy,
        focus: rel.impact.focus
      }
    };
  }

  private static calculatePairImpact(
    category1: string,
    category2: string
  ): CategoryRelationship['impact'] | null {
    const cat1 = this.categories.get(category1);
    const cat2 = this.categories.get(category2);
    if (!cat1 || !cat2) return null;

    const relationship = cat1.relationships.find(r => r.targetId === category2);
    if (!relationship) return null;

    return relationship.impact;
  }

  private static calculateSwitchCost(
    fromCategory: string,
    toCategory: string
  ): number {
    const from = this.categories.get(fromCategory);
    const to = this.categories.get(toCategory);
    if (!from || !to) return 0;

    const baseCost = (from.attributes.contextSwitchCost + to.attributes.contextSwitchCost) / 200;
    const relationship = from.relationships.find(r => r.targetId === toCategory);

    if (!relationship) return baseCost;

    // Adjust cost based on relationship type
    const relationshipFactor = {
      complements: 0.7,
      conflicts: 1.3,
      precedes: 0.8,
      enables: 0.8,
      similar: 0.6
    }[relationship.type];

    return baseCost * relationshipFactor;
  }

  private static extractCategories(tasks: Task[]): string[] {
    const categories = new Set<string>();
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        if (this.categories.has(tag)) {
          categories.add(tag);
        }
      });
    });
    return Array.from(categories);
  }

  private static findOptimalSequence(
    categories: string[],
    userEnergy: number,
    timeOfDay: number
  ): string[] {
    // Score each category based on current conditions
    const scores = new Map<string, number>();
    categories.forEach(cat => {
      const category = this.categories.get(cat);
      if (!category) return;

      let score = 0;
      
      // Energy alignment
      score += (1 - Math.abs(userEnergy - category.attributes.energyDemand / 100)) * 0.3;
      
      // Time of day alignment
      const hourDiff = Math.abs(category.stats.peakTimeOfDay - timeOfDay);
      score += (1 - hourDiff / 12) * 0.3;
      
      // Success rate
      score += category.stats.successRate * 0.4;

      scores.set(cat, score);
    });

    // Sort categories by score and relationship optimization
    return this.optimizeSequence(categories, scores);
  }

  private static optimizeSequence(
    categories: string[],
    scores: Map<string, number>
  ): string[] {
    const sequence: string[] = [];
    const remaining = new Set(categories);

    // Start with highest scoring category
    let current = Array.from(remaining).reduce((a, b) => 
      (scores.get(a) || 0) > (scores.get(b) || 0) ? a : b
    );

    while (remaining.size > 0) {
      sequence.push(current);
      remaining.delete(current);

      if (remaining.size === 0) break;

      // Find next best category based on relationships and scores
      current = this.findNextBestCategory(current, Array.from(remaining), scores);
    }

    return sequence;
  }

  private static findNextBestCategory(
    current: string,
    remaining: string[],
    scores: Map<string, number>
  ): string {
    const currentCat = this.categories.get(current);
    if (!currentCat) return remaining[0];

    return remaining.reduce((best, next) => {
      const bestScore = this.calculateTransitionScore(current, best, scores);
      const nextScore = this.calculateTransitionScore(current, next, scores);
      return bestScore > nextScore ? best : next;
    });
  }

  private static calculateTransitionScore(
    from: string,
    to: string,
    scores: Map<string, number>
  ): number {
    const baseScore = scores.get(to) || 0;
    const switchCost = this.calculateSwitchCost(from, to);
    const relationship = this.categories.get(from)?.relationships
      .find(r => r.targetId === to);

    let relationshipBonus = 0;
    if (relationship) {
      relationshipBonus = {
        complements: 0.2,
        precedes: 0.3,
        enables: 0.3,
        similar: 0.1,
        conflicts: -0.2
      }[relationship.type];
    }

    return baseScore * (1 - switchCost) + relationshipBonus;
  }

  private static calculateSequenceSwitchCosts(sequence: string[]): number[] {
    const costs: number[] = [0]; // First category has no switch cost
    
    for (let i = 1; i < sequence.length; i++) {
      costs.push(this.calculateSwitchCost(sequence[i-1], sequence[i]));
    }

    return costs;
  }

  private static calculateEnergyProfile(
    sequence: string[],
    initialEnergy: number
  ): number[] {
    const profile: number[] = [initialEnergy];
    let currentEnergy = initialEnergy;

    for (let i = 1; i < sequence.length; i++) {
      const category = this.categories.get(sequence[i]);
      if (!category) continue;

      const energyDemand = category.attributes.energyDemand / 100;
      const switchCost = this.calculateSwitchCost(sequence[i-1], sequence[i]);
      
      currentEnergy = Math.max(0.1, currentEnergy - (energyDemand * 0.2) - switchCost);
      profile.push(currentEnergy);
    }

    return profile;
  }

  private static calculateFocusProfile(sequence: string[]): number[] {
    return sequence.map(categoryId => {
      const category = this.categories.get(categoryId);
      return category ? category.attributes.focusRequired / 100 : 0.5;
    });
  }

  private static generateOptimizationRecommendations(
    sequence: string[],
    switchCosts: number[],
    energyProfile: number[],
    focusProfile: number[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for high switch costs
    const highSwitchCosts = switchCosts.filter(cost => cost > 0.3);
    if (highSwitchCosts.length > 0) {
      recommendations.push(`Consider adding transition activities between ${highSwitchCosts.length} high-cost context switches`);
    }

    // Check for energy dips
    const energyDips = energyProfile.filter(energy => energy < 0.3);
    if (energyDips.length > 0) {
      recommendations.push(`Plan for ${energyDips.length} energy recovery periods in your schedule`);
    }

    // Check focus requirements
    const highFocusPeriods = focusProfile.filter(focus => focus > 0.7);
    if (highFocusPeriods.length > 2) {
      recommendations.push('Distribute high-focus activities throughout the day');
    }

    // Sequence-specific recommendations
    if (sequence.length > 3) {
      recommendations.push('Consider breaking the sequence into smaller batches with breaks in between');
    }

    return recommendations;
  }
}
