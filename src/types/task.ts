import { PriorityFactors, UrgencyMetrics } from '../utils/priorityManager';

export interface SubTask {
  id?: string;
  title: string;
  completed?: boolean;
  status?: 'pending' | 'in_progress' | 'completed';
  estimatedDuration?: number;
  cognitiveLoad?: number;
  order?: number;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  subtasks: SubTask[];
  priority: 'low' | 'medium' | 'high';
  priorityScore?: number;
  priorityFactors?: PriorityFactors;
  urgencyMetrics?: UrgencyMetrics;
  lastPriorityUpdate?: string;
  contextChanges?: number;
  dueDate: string;
  completionPercentage?: number;
  aiSuggestions?: string[];
  tags?: string[];
  energyLevel?: number;
  focusLevel?: number;
  timeEstimate?: number;
  actualTime?: number;
  createdAt?: string;
  updatedAt?: string;
  dependencies?: string[];  // IDs of tasks that this task depends on
  blockedBy?: string[];    // IDs of tasks that block this task
}
