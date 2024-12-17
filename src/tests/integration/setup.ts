import { D1Database } from '@cloudflare/workers-types';
import { EnergyPatternService } from '../../services/energy_patterns';
import { CollaborationService } from '../../services/collaboration';
import { NotificationService } from '../../services/notification_service';
import { AnalyticsService } from '../../services/analytics_service';

export interface TestContext {
    db: D1Database;
    energyService: EnergyPatternService;
    collaborationService: CollaborationService;
    notificationService: NotificationService;
    analyticsService: AnalyticsService;
    testUser: {
        id: string;
        email: string;
        name: string;
    };
}

export async function setupTestContext(): Promise<TestContext> {
    // Create test database
    const db = await createTestDatabase();
    
    // Create test user
    const testUser = {
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User'
    };
    
    // Initialize services
    const energyService = new EnergyPatternService(db);
    const collaborationService = new CollaborationService(db);
    const notificationService = new NotificationService(testUser.id, 'ws://localhost:8787');
    const analyticsService = new AnalyticsService(db);
    
    return {
        db,
        energyService,
        collaborationService,
        notificationService,
        analyticsService,
        testUser
    };
}

async function createTestDatabase(): Promise<D1Database> {
    // Create an in-memory SQLite database for testing
    const db = await require('better-sqlite3')(':memory:');
    
    // Run migrations
    await db.exec(`
        -- Users table
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tasks table
        CREATE TABLE tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            description TEXT,
            status TEXT,
            cognitive_load TEXT,
            context TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Energy levels table
        CREATE TABLE energy_levels (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            level REAL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Collaborations table
        CREATE TABLE collaborations (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            partner_id TEXT,
            role TEXT,
            permissions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (partner_id) REFERENCES users(id)
        );

        -- Task comments table
        CREATE TABLE task_comments (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            user_id TEXT,
            content TEXT,
            type TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Task progress table
        CREATE TABLE task_progress (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            user_id TEXT,
            progress REAL,
            old_progress REAL,
            message TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);

    return db as unknown as D1Database;
}

export async function cleanupTestContext(context: TestContext) {
    // Close database connection
    await (context.db as any).close();
    
    // Close WebSocket connection
    context.notificationService.disconnect();
}
