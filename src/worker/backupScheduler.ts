import { Cron } from '@cloudflare/workers-types';
import { BackupManager } from '../utils/backupManager';

export interface Env {
  DB: D1Database;
  BACKUP_SCHEDULE: string;
}

export default {
  async scheduled(event: Cron, env: Env, ctx: ExecutionContext): Promise<void> {
    const backupManager = BackupManager.getInstance();

    try {
      // Determine backup type based on schedule
      const now = new Date();
      const isFullBackup = now.getDay() === 0; // Full backup on Sundays

      if (isFullBackup) {
        console.log('Starting full backup...');
        await backupManager.createFullBackup(env.DB);
      } else {
        console.log('Starting incremental backup...');
        await backupManager.createIncrementalBackup(env.DB);
      }

      // Clean up old backups (keep last 30 days)
      await cleanupOldBackups(env.DB);

    } catch (error) {
      console.error('Backup failed:', error);
      // Here you would typically notify your error tracking service
      throw error;
    }
  },
};

async function cleanupOldBackups(db: D1Database): Promise<void> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  try {
    // Get old backup metadata
    const oldBackups = await db.prepare(
      'SELECT * FROM backup_metadata WHERE timestamp < ?'
    ).bind(thirtyDaysAgo).all();

    for (const backup of oldBackups.results) {
      // Delete from R2
      await BackupManager.getInstance().s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: backup.key,
      }));

      // Delete metadata
      await db.prepare(
        'DELETE FROM backup_metadata WHERE timestamp = ?'
      ).bind(backup.timestamp).run();
    }

    console.log(`Cleaned up ${oldBackups.results.length} old backups`);
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
    throw error;
  }
}
