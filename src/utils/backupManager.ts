import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { D1Database } from '@cloudflare/workers-types';
import { Task } from '../types/task';

interface BackupMetadata {
  timestamp: number;
  version: string;
  type: 'full' | 'incremental';
  checksum: string;
}

export class BackupManager {
  private static instance: BackupManager;
  private s3Client: S3Client;
  private readonly bucketName: string;

  private constructor() {
    // Initialize S3 client with Cloudflare R2 credentials
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.R2_BUCKET_NAME || 'done365-backups';
  }

  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  private async generateChecksum(data: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getBackupKey(timestamp: number, type: 'full' | 'incremental'): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];
    return `backups/${dateStr}/${type}-${timestamp}.json`;
  }

  public async createFullBackup(db: D1Database): Promise<void> {
    try {
      // Get all data that needs to be backed up
      const tasks = await db.prepare('SELECT * FROM tasks').all();
      const users = await db.prepare('SELECT * FROM users').all();
      const preferences = await db.prepare('SELECT * FROM user_preferences').all();
      const metrics = await db.prepare('SELECT * FROM user_metrics').all();

      const backupData = {
        tasks: tasks.results,
        users: users.results,
        preferences: preferences.results,
        metrics: metrics.results,
        schema_version: '1.0',
      };

      const backupString = JSON.stringify(backupData, null, 2);
      const checksum = await this.generateChecksum(backupString);

      const metadata: BackupMetadata = {
        timestamp: Date.now(),
        version: '1.0',
        type: 'full',
        checksum,
      };

      const key = this.getBackupKey(metadata.timestamp, 'full');

      // Upload to R2
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: backupString,
        ContentType: 'application/json',
        Metadata: {
          'backup-type': 'full',
          'backup-version': metadata.version,
          'backup-checksum': checksum,
        },
      }));

      // Also save metadata to database
      await db.prepare(
        'INSERT INTO backup_metadata (timestamp, version, type, checksum, key) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        metadata.timestamp,
        metadata.version,
        metadata.type,
        metadata.checksum,
        key
      ).run();

      console.log(`Full backup created successfully: ${key}`);
    } catch (error) {
      console.error('Error creating full backup:', error);
      throw error;
    }
  }

  public async createIncrementalBackup(db: D1Database): Promise<void> {
    try {
      // Get only changed data since last backup
      const lastBackupTime = await this.getLastBackupTime(db);
      
      const changedData = {
        tasks: (await db.prepare(
          'SELECT * FROM tasks WHERE modified_at > ?'
        ).bind(lastBackupTime).all()).results,
        users: (await db.prepare(
          'SELECT * FROM users WHERE modified_at > ?'
        ).bind(lastBackupTime).all()).results,
        preferences: (await db.prepare(
          'SELECT * FROM user_preferences WHERE modified_at > ?'
        ).bind(lastBackupTime).all()).results,
        metrics: (await db.prepare(
          'SELECT * FROM user_metrics WHERE modified_at > ?'
        ).bind(lastBackupTime).all()).results,
        schema_version: '1.0',
      };

      const backupString = JSON.stringify(changedData, null, 2);
      const checksum = await this.generateChecksum(backupString);

      const metadata: BackupMetadata = {
        timestamp: Date.now(),
        version: '1.0',
        type: 'incremental',
        checksum,
      };

      const key = this.getBackupKey(metadata.timestamp, 'incremental');

      // Upload to R2
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: backupString,
        ContentType: 'application/json',
        Metadata: {
          'backup-type': 'incremental',
          'backup-version': metadata.version,
          'backup-checksum': checksum,
          'parent-backup': lastBackupTime.toString(),
        },
      }));

      // Save metadata
      await db.prepare(
        'INSERT INTO backup_metadata (timestamp, version, type, checksum, key) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        metadata.timestamp,
        metadata.version,
        metadata.type,
        metadata.checksum,
        key
      ).run();

      console.log(`Incremental backup created successfully: ${key}`);
    } catch (error) {
      console.error('Error creating incremental backup:', error);
      throw error;
    }
  }

  private async getLastBackupTime(db: D1Database): Promise<number> {
    const result = await db.prepare(
      'SELECT MAX(timestamp) as last_backup FROM backup_metadata'
    ).first();
    return result?.last_backup || 0;
  }

  public async restoreFromBackup(
    db: D1Database,
    timestamp: number
  ): Promise<void> {
    try {
      // Get backup metadata
      const metadata = await db.prepare(
        'SELECT * FROM backup_metadata WHERE timestamp = ?'
      ).bind(timestamp).first();

      if (!metadata) {
        throw new Error('Backup not found');
      }

      // Get backup from R2
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: metadata.key,
      }));

      const backupData = JSON.parse(await response.Body!.transformToString());

      // Verify checksum
      const checksum = await this.generateChecksum(JSON.stringify(backupData, null, 2));
      if (checksum !== metadata.checksum) {
        throw new Error('Backup checksum verification failed');
      }

      // Begin transaction
      await db.prepare('BEGIN TRANSACTION').run();

      try {
        // Restore data
        if (metadata.type === 'full') {
          // Clear existing data
          await db.prepare('DELETE FROM tasks').run();
          await db.prepare('DELETE FROM users').run();
          await db.prepare('DELETE FROM user_preferences').run();
          await db.prepare('DELETE FROM user_metrics').run();
        }

        // Insert backup data
        for (const task of backupData.tasks) {
          await db.prepare(
            'INSERT OR REPLACE INTO tasks (id, title, description, status, priority, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            task.id,
            task.title,
            task.description,
            task.status,
            task.priority,
            task.created_at,
            task.modified_at
          ).run();
        }

        // Similar inserts for users, preferences, and metrics...

        await db.prepare('COMMIT').run();
        console.log(`Restore completed successfully from backup at ${new Date(timestamp)}`);
      } catch (error) {
        await db.prepare('ROLLBACK').run();
        throw error;
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  public async listBackups(db: D1Database): Promise<BackupMetadata[]> {
    try {
      const backups = await db.prepare(
        'SELECT * FROM backup_metadata ORDER BY timestamp DESC'
      ).all();
      return backups.results as BackupMetadata[];
    } catch (error) {
      console.error('Error listing backups:', error);
      throw error;
    }
  }

  public async verifyBackup(timestamp: number): Promise<boolean> {
    try {
      const metadata = await this.db.prepare(
        'SELECT * FROM backup_metadata WHERE timestamp = ?'
      ).bind(timestamp).first();

      if (!metadata) {
        throw new Error('Backup not found');
      }

      // Get backup from R2
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: metadata.key,
      }));

      const backupData = await response.Body!.transformToString();
      const checksum = await this.generateChecksum(backupData);

      return checksum === metadata.checksum;
    } catch (error) {
      console.error('Error verifying backup:', error);
      return false;
    }
  }
}
