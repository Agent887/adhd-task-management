import { Task } from '../types/task';

interface TaskRelationship {
  sourceId: string;
  targetId: string;
  type: 'blocks' | 'requires' | 'related' | 'subtask' | 'parallel';
  impact: number; // 0-1 scale
  description?: string;
}

interface TaskImpact {
  taskId: string;
  impactScore: number;
  impactType: 'delay' | 'block' | 'resource' | 'context';
  affectedTasks: string[];
}

interface ConflictReport {
  taskId: string;
  conflictType: 'timing' | 'resource' | 'dependency' | 'context';
  severity: number;
  affectedTasks: string[];
  resolution: string[];
}

export class TaskRelationships {
  private static relationships: Map<string, TaskRelationship[]> = new Map();

  /**
   * Map dependencies between tasks
   */
  static mapDependencies(tasks: Task[]): Map<string, TaskRelationship[]> {
    this.relationships.clear();
    
    tasks.forEach(task => {
      // Direct dependencies
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          this.addRelationship({
            sourceId: task.id,
            targetId: depId,
            type: 'requires',
            impact: 1.0
          });
        });
      }

      // Subtask relationships
      if (task.subtasks) {
        task.subtasks.forEach(subtask => {
          this.addRelationship({
            sourceId: task.id,
            targetId: subtask.id,
            type: 'subtask',
            impact: 0.8
          });
        });
      }

      // Context-based relationships
      if (task.tags) {
        tasks.filter(t => t.id !== task.id && t.tags?.some(tag => task.tags?.includes(tag)))
          .forEach(relatedTask => {
            this.addRelationship({
              sourceId: task.id,
              targetId: relatedTask.id,
              type: 'related',
              impact: 0.4
            });
          });
      }

      // Temporal relationships (tasks with overlapping time windows)
      if (task.timeEstimate && task.dueDate) {
        tasks.filter(t => 
          t.id !== task.id && 
          t.timeEstimate && 
          t.dueDate &&
          this.hasTimeOverlap(task, t)
        ).forEach(overlappingTask => {
          this.addRelationship({
            sourceId: task.id,
            targetId: overlappingTask.id,
            type: 'parallel',
            impact: 0.6
          });
        });
      }
    });

    return this.relationships;
  }

  /**
   * Analyze impact of task changes
   */
  static analyzeImpact(taskId: string): TaskImpact[] {
    const impacts: TaskImpact[] = [];
    const task = this.getTaskById(taskId);
    if (!task) return impacts;

    // Direct dependency impact
    const dependencyImpact = this.analyzeDependencyImpact(task);
    if (dependencyImpact) impacts.push(dependencyImpact);

    // Resource competition impact
    const resourceImpact = this.analyzeResourceImpact(task);
    if (resourceImpact) impacts.push(resourceImpact);

    // Context switching impact
    const contextImpact = this.analyzeContextImpact(task);
    if (contextImpact) impacts.push(contextImpact);

    // Time delay impact
    const timeImpact = this.analyzeTimeImpact(task);
    if (timeImpact) impacts.push(timeImpact);

    return impacts;
  }

  /**
   * Detect conflicts between tasks
   */
  static detectConflicts(tasks: Task[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];

    // Resource conflicts
    this.detectResourceConflicts(tasks).forEach(conflict => conflicts.push(conflict));

    // Timing conflicts
    this.detectTimingConflicts(tasks).forEach(conflict => conflicts.push(conflict));

    // Dependency conflicts
    this.detectDependencyConflicts(tasks).forEach(conflict => conflicts.push(conflict));

    // Context conflicts
    this.detectContextConflicts(tasks).forEach(conflict => conflicts.push(conflict));

    return conflicts;
  }

  private static addRelationship(relationship: TaskRelationship) {
    const existing = this.relationships.get(relationship.sourceId) || [];
    existing.push(relationship);
    this.relationships.set(relationship.sourceId, existing);
  }

  private static hasTimeOverlap(task1: Task, task2: Task): boolean {
    if (!task1.timeEstimate || !task2.timeEstimate || !task1.dueDate || !task2.dueDate) {
      return false;
    }

    const task1Start = new Date(task1.dueDate.getTime() - task1.timeEstimate * 3600000);
    const task2Start = new Date(task2.dueDate.getTime() - task2.timeEstimate * 3600000);

    return (
      (task1Start <= task2.dueDate && task1.dueDate >= task2Start) ||
      (task2Start <= task1.dueDate && task2.dueDate >= task1Start)
    );
  }

  private static getTaskById(taskId: string): Task | undefined {
    // Implementation would depend on task storage/access mechanism
    return undefined;
  }

  private static analyzeDependencyImpact(task: Task): TaskImpact | null {
    const relationships = this.relationships.get(task.id);
    if (!relationships?.length) return null;

    const dependentTasks = relationships
      .filter(r => r.type === 'requires' || r.type === 'blocks')
      .map(r => r.targetId);

    if (!dependentTasks.length) return null;

    return {
      taskId: task.id,
      impactScore: 0.8,
      impactType: 'block',
      affectedTasks: dependentTasks
    };
  }

  private static analyzeResourceImpact(task: Task): TaskImpact | null {
    const relationships = this.relationships.get(task.id);
    if (!relationships?.length) return null;

    const resourceCompetitors = relationships
      .filter(r => r.type === 'parallel')
      .map(r => r.targetId);

    if (!resourceCompetitors.length) return null;

    return {
      taskId: task.id,
      impactScore: 0.6,
      impactType: 'resource',
      affectedTasks: resourceCompetitors
    };
  }

  private static analyzeContextImpact(task: Task): TaskImpact | null {
    const relationships = this.relationships.get(task.id);
    if (!relationships?.length) return null;

    const contextRelated = relationships
      .filter(r => r.type === 'related')
      .map(r => r.targetId);

    if (!contextRelated.length) return null;

    return {
      taskId: task.id,
      impactScore: 0.4,
      impactType: 'context',
      affectedTasks: contextRelated
    };
  }

  private static analyzeTimeImpact(task: Task): TaskImpact | null {
    if (!task.timeEstimate || !task.dueDate) return null;

    const relationships = this.relationships.get(task.id);
    if (!relationships?.length) return null;

    const timeImpacted = relationships
      .filter(r => r.type === 'parallel' || r.type === 'requires')
      .map(r => r.targetId);

    if (!timeImpacted.length) return null;

    return {
      taskId: task.id,
      impactScore: 0.7,
      impactType: 'delay',
      affectedTasks: timeImpacted
    };
  }

  private static detectResourceConflicts(tasks: Task[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    const resourceGroups = new Map<string, Task[]>();

    // Group tasks by resource requirements (e.g., high focus, specific tools)
    tasks.forEach(task => {
      if (task.focusLevel && task.focusLevel > 70) {
        const highFocusTasks = resourceGroups.get('highFocus') || [];
        highFocusTasks.push(task);
        resourceGroups.set('highFocus', highFocusTasks);
      }
    });

    // Check for conflicts in each resource group
    resourceGroups.forEach((groupTasks, resource) => {
      if (this.hasTimeOverlapInGroup(groupTasks)) {
        conflicts.push({
          taskId: groupTasks[0].id,
          conflictType: 'resource',
          severity: 0.8,
          affectedTasks: groupTasks.map(t => t.id),
          resolution: [
            'Reschedule tasks to different time slots',
            'Reduce resource requirements if possible',
            'Consider task delegation'
          ]
        });
      }
    });

    return conflicts;
  }

  private static detectTimingConflicts(tasks: Task[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    const timelineTasks = tasks.filter(t => t.timeEstimate && t.dueDate);

    for (let i = 0; i < timelineTasks.length; i++) {
      for (let j = i + 1; j < timelineTasks.length; j++) {
        if (this.hasTimeOverlap(timelineTasks[i], timelineTasks[j])) {
          conflicts.push({
            taskId: timelineTasks[i].id,
            conflictType: 'timing',
            severity: 0.7,
            affectedTasks: [timelineTasks[i].id, timelineTasks[j].id],
            resolution: [
              'Adjust task schedules',
              'Consider parallel execution if possible',
              'Evaluate priority and potentially reschedule lower priority task'
            ]
          });
        }
      }
    }

    return conflicts;
  }

  private static detectDependencyConflicts(tasks: Task[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    const dependencyMap = new Map<string, string[]>();

    // Build dependency map
    tasks.forEach(task => {
      if (task.dependencies) {
        dependencyMap.set(task.id, task.dependencies);
      }
    });

    // Check for circular dependencies
    dependencyMap.forEach((deps, taskId) => {
      if (this.hasCircularDependency(taskId, deps, dependencyMap)) {
        conflicts.push({
          taskId,
          conflictType: 'dependency',
          severity: 1.0,
          affectedTasks: [taskId, ...deps],
          resolution: [
            'Break circular dependency chain',
            'Restructure task relationships',
            'Consider merging interdependent tasks'
          ]
        });
      }
    });

    return conflicts;
  }

  private static detectContextConflicts(tasks: Task[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    const contextGroups = new Map<string, Task[]>();

    // Group tasks by context
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        const contextTasks = contextGroups.get(tag) || [];
        contextTasks.push(task);
        contextGroups.set(tag, contextTasks);
      });
    });

    // Check for context switching conflicts
    contextGroups.forEach((groupTasks, context) => {
      if (this.hasExcessiveContextSwitching(groupTasks)) {
        conflicts.push({
          taskId: groupTasks[0].id,
          conflictType: 'context',
          severity: 0.6,
          affectedTasks: groupTasks.map(t => t.id),
          resolution: [
            'Batch similar context tasks together',
            'Add buffer time between context switches',
            'Consider rescheduling to minimize switches'
          ]
        });
      }
    });

    return conflicts;
  }

  private static hasTimeOverlapInGroup(tasks: Task[]): boolean {
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        if (this.hasTimeOverlap(tasks[i], tasks[j])) {
          return true;
        }
      }
    }
    return false;
  }

  private static hasCircularDependency(
    taskId: string,
    deps: string[],
    depMap: Map<string, string[]>,
    visited: Set<string> = new Set()
  ): boolean {
    if (visited.has(taskId)) return true;
    visited.add(taskId);

    for (const dep of deps) {
      const subDeps = depMap.get(dep);
      if (subDeps && this.hasCircularDependency(dep, subDeps, depMap, visited)) {
        return true;
      }
    }

    visited.delete(taskId);
    return false;
  }

  private static hasExcessiveContextSwitching(tasks: Task[]): boolean {
    if (tasks.length < 3) return false;

    let switches = 0;
    for (let i = 1; i < tasks.length; i++) {
      if (!this.sharesSimilarContext(tasks[i], tasks[i - 1])) {
        switches++;
      }
    }

    return switches > Math.floor(tasks.length / 2);
  }

  private static sharesSimilarContext(task1: Task, task2: Task): boolean {
    return task1.tags?.some(tag => task2.tags?.includes(tag)) || false;
  }
}
