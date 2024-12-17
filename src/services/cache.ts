import { KVNamespace } from '@cloudflare/workers-types';
import { CacheEntry, LLMCacheConfig, TaskAnalysis } from '../types';

export class CacheService {
    private config: LLMCacheConfig = {
        defaultTTL: 24 * 60 * 60, // 24 hours in seconds
        maxEntries: 1000,
        cleanupInterval: 60 * 60 // 1 hour in seconds
    };

    constructor(
        private cache: KVNamespace,
        config?: Partial<LLMCacheConfig>
    ) {
        this.config = { ...this.config, ...config };
        this.scheduleCleanup();
    }

    private scheduleCleanup() {
        setInterval(async () => {
            await this.cleanup();
        }, this.config.cleanupInterval * 1000);
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = await this.cache.get<CacheEntry<T>>(key, 'json');
        
        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            await this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    async set<T>(key: string, data: T, ttl?: number): Promise<void> {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL
        };

        await this.cache.put(key, JSON.stringify(entry), {
            expirationTtl: entry.ttl
        });

        // Check if we need to clean up old entries
        const totalKeys = await this.getTotalKeys();
        if (totalKeys > this.config.maxEntries) {
            await this.cleanup();
        }
    }

    async delete(key: string): Promise<void> {
        await this.cache.delete(key);
    }

    private isExpired<T>(entry: CacheEntry<T>): boolean {
        const now = Date.now();
        return now - entry.timestamp > entry.ttl * 1000;
    }

    private async getTotalKeys(): Promise<number> {
        const list = await this.cache.list();
        return list.keys.length;
    }

    private async cleanup(): Promise<void> {
        const list = await this.cache.list();
        const now = Date.now();

        for (const key of list.keys) {
            const entry = await this.cache.get<CacheEntry<any>>(key.name, 'json');
            if (entry && this.isExpired(entry)) {
                await this.cache.delete(key.name);
            }
        }
    }

    // Task-specific cache methods
    async getCachedTaskAnalysis(taskId: string): Promise<TaskAnalysis | null> {
        return this.get<TaskAnalysis>(`task_analysis:${taskId}`);
    }

    async cacheTaskAnalysis(taskId: string, analysis: TaskAnalysis): Promise<void> {
        await this.set<TaskAnalysis>(
            `task_analysis:${taskId}`,
            { ...analysis, cached_at: new Date().toISOString() }
        );
    }

    async invalidateTaskAnalysis(taskId: string): Promise<void> {
        await this.delete(`task_analysis:${taskId}`);
    }

    // Batch operations for better performance
    async getCachedTaskAnalyses(taskIds: string[]): Promise<Map<string, TaskAnalysis>> {
        const results = new Map<string, TaskAnalysis>();
        
        await Promise.all(
            taskIds.map(async taskId => {
                const analysis = await this.getCachedTaskAnalysis(taskId);
                if (analysis) {
                    results.set(taskId, analysis);
                }
            })
        );

        return results;
    }

    async cacheTaskAnalyses(analyses: Map<string, TaskAnalysis>): Promise<void> {
        await Promise.all(
            Array.from(analyses.entries()).map(([taskId, analysis]) => 
                this.cacheTaskAnalysis(taskId, analysis)
            )
        );
    }
}
