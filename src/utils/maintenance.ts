import { CacheManager } from './cache';
import { DB } from '../worker';

export class MaintenanceManager {
  private static instance: MaintenanceManager;
  private cacheManager: CacheManager;

  private constructor() {
    this.cacheManager = CacheManager.getInstance();
  }

  static getInstance(): MaintenanceManager {
    if (!MaintenanceManager.instance) {
      MaintenanceManager.instance = new MaintenanceManager();
    }
    return MaintenanceManager.instance;
  }

  // Run all maintenance tasks
  async runMaintenance(): Promise<void> {
    await Promise.all([
      this.cleanupCache(),
      this.optimizeDatabase(),
      this.archiveOldData(),
      this.cleanupTempFiles()
    ]);
  }

  // Cache maintenance
  private async cleanupCache(): Promise<void> {
    await this.cacheManager.cleanup();
  }

  // Database optimization
  private async optimizeDatabase(): Promise<void> {
    try {
      // Run VACUUM to reclaim space
      await DB.prepare('VACUUM;').run();
      
      // Update statistics for query optimizer
      await DB.prepare('ANALYZE;').run();
      
      // Clean up old metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await DB.prepare(`
        DELETE FROM TaskMetrics 
        WHERE last_updated < ? 
        AND task_id NOT IN (
          SELECT id FROM Tasks 
          WHERE status != 'completed'
        );
      `).bind(thirtyDaysAgo.toISOString()).run();
    } catch (error) {
      console.error('Database optimization error:', error);
    }
  }

  // Archive old data
  private async archiveOldData(): Promise<void> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Archive old completed tasks
      const oldTasks = await DB.prepare(`
        SELECT * FROM Tasks 
        WHERE status = 'completed' 
        AND due_date < ?
      `).bind(sixMonthsAgo.toISOString()).all();

      if (oldTasks.results?.length) {
        // Store in archive table with compressed data
        await DB.prepare(`
          INSERT INTO TaskArchive (
            task_data,
            archived_at
          ) VALUES (?, CURRENT_TIMESTAMP);
        `).bind(JSON.stringify(oldTasks.results)).run();

        // Remove from main table
        await DB.prepare(`
          DELETE FROM Tasks 
          WHERE id IN (
            SELECT id FROM Tasks 
            WHERE status = 'completed' 
            AND due_date < ?
          );
        `).bind(sixMonthsAgo.toISOString()).run();
      }
    } catch (error) {
      console.error('Data archiving error:', error);
    }
  }

  // Cleanup temporary files
  private async cleanupTempFiles(): Promise<void> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      await DB.prepare(`
        DELETE FROM Cache 
        WHERE expiry < ?;
      `).bind(oneDayAgo.toISOString()).run();
    } catch (error) {
      console.error('Temp files cleanup error:', error);
    }
  }

  // Schedule maintenance tasks
  scheduleMaintenanceTasks(): void {
    // Run maintenance daily during off-peak hours
    const maintenanceTime = new Date();
    maintenanceTime.setHours(3, 0, 0, 0); // 3 AM

    const now = new Date();
    let delay = maintenanceTime.getTime() - now.getTime();
    if (delay < 0) {
      delay += 24 * 60 * 60 * 1000; // Add 24 hours if time already passed
    }

    setTimeout(() => {
      this.runMaintenance();
      this.scheduleMaintenanceTasks(); // Reschedule for next day
    }, delay);
  }
}
