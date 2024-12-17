import { Task } from './task';

export type CollaboratorRole = 'accountability' | 'support' | 'collaborator';

export interface CollaborationPartner {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  avatar?: string;
  lastActive?: string;
}

export interface SharedTask extends Omit<Task, 'id'> {
  id: string;
  sharedBy: string;
  sharedWith: string[];
  collaborators: CollaborationPartner[];
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  sharedAt: string;
  lastModified: string;
}

export interface CollaborationStats {
  totalSharedTasks: number;
  activeCollaborators: number;
  completedSharedTasks: number;
  pendingSharedTasks: number;
}

export interface CollaborationActivity {
  id: string;
  type: 'task_shared' | 'task_updated' | 'task_completed' | 'comment_added';
  taskId: string;
  userId: string;
  timestamp: string;
  details?: string;
}
