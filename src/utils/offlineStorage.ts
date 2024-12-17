import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task } from '../types/task';

interface TaskDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: Task & {
      syncStatus: 'pending' | 'synced' | 'error';
      lastModified: number;
    };
    indexes: { 'by-sync-status': string };
  };
  syncQueue: {
    key: string;
    value: {
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retries: number;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<TaskDBSchema> | null = null;
  private syncInProgress = false;

  async initialize() {
    this.db = await openDB<TaskDBSchema>('task-manager', 1, {
      upgrade(db) {
        // Tasks store
        const taskStore = db.createObjectStore('tasks', {
          keyPath: 'id',
        });
        taskStore.createIndex('by-sync-status', 'syncStatus');

        // Sync queue store
        db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
  }

  async saveTask(task: Task): Promise<void> {
    if (!this.db) await this.initialize();

    const enhancedTask = {
      ...task,
      syncStatus: 'pending' as const,
      lastModified: Date.now(),
    };

    await this.db!.put('tasks', enhancedTask);
    await this.addToSyncQueue('update', enhancedTask);
    this.triggerSync();
  }

  async getTask(id: string): Promise<Task | null> {
    if (!this.db) await this.initialize();
    return this.db!.get('tasks', id);
  }

  async getAllTasks(): Promise<Task[]> {
    if (!this.db) await this.initialize();
    return this.db!.getAll('tasks');
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('tasks', id);
    await this.addToSyncQueue('delete', { id });
    this.triggerSync();
  }

  private async addToSyncQueue(
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    await this.db!.add('syncQueue', {
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
  }

  private async triggerSync(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        await navigator.serviceWorker.controller.postMessage({
          type: 'sync-tasks',
        });
      } else {
        await this.performSync();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async performSync(): Promise<void> {
    const queue = await this.db!.getAll('syncQueue');
    
    for (const item of queue) {
      try {
        // Attempt to sync with server
        const response = await fetch('/api/tasks/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: item.action,
            data: item.data,
          }),
        });

        if (response.ok) {
          // Update local task status
          if (item.action !== 'delete') {
            const task = await response.json();
            await this.db!.put('tasks', {
              ...task,
              syncStatus: 'synced',
              lastModified: Date.now(),
            });
          }
          // Remove from sync queue
          await this.db!.delete('syncQueue', item.key);
        } else {
          throw new Error(`Sync failed: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Sync error:', error);
        // Increment retry count
        await this.db!.put('syncQueue', {
          ...item,
          retries: item.retries + 1,
        });
      }
    }
  }

  // Listen for online/offline events
  setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      // Could show offline notification to user
      console.log('App is offline. Changes will be synced when online.');
    });
  }
}

export const offlineStorage = new OfflineStorage();
