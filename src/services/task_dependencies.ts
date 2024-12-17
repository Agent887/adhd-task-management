import { D1Database } from '@cloudflare/workers-types';
import { LLMService } from './llm';

interface TaskDependency {
    task_id: number;
    dependency_id: number;
    dependency_type: 'blocks' | 'required_for' | 'enhances' | 'related';
    impact_level?: number;
    notes?: string;
}

interface ComplexityMetrics {
    dependency_count: number;
    blocking_count: number;
    max_chain_depth: number;
    complexity_score: number;
}

interface DependencyChain {
    task_id: number;
    dependency_id: number;
    dependency_type: string;
    depth: number;
    path: string;
}

export class TaskDependencyService {
    constructor(
        private db: D1Database,
        private llm: LLMService
    ) {}

    async addDependency(dependency: TaskDependency): Promise<void> {
        // Validate that we're not creating a circular dependency
        const wouldCreateCircular = await this.wouldCreateCircularDependency(
            dependency.task_id,
            dependency.dependency_id
        );

        if (wouldCreateCircular) {
            throw new Error('Cannot add dependency: would create a circular dependency');
        }

        await this.db
            .prepare(`
                INSERT INTO task_dependencies (
                    task_id, dependency_id, dependency_type,
                    impact_level, notes
                ) VALUES (?, ?, ?, ?, ?)
            `)
            .bind(
                dependency.task_id,
                dependency.dependency_id,
                dependency.dependency_type,
                dependency.impact_level || null,
                dependency.notes || null
            )
            .run();
    }

    async removeDependency(taskId: number, dependencyId: number): Promise<void> {
        await this.db
            .prepare('DELETE FROM task_dependencies WHERE task_id = ? AND dependency_id = ?')
            .bind(taskId, dependencyId)
            .run();
    }

    async getDependencies(taskId: number): Promise<TaskDependency[]> {
        const result = await this.db
            .prepare(`
                SELECT * FROM task_dependencies
                WHERE task_id = ?
                ORDER BY dependency_type, impact_level DESC
            `)
            .bind(taskId)
            .all();

        return result.results as TaskDependency[];
    }

    async getDependencyChain(taskId: number): Promise<DependencyChain[]> {
        const result = await this.db
            .prepare('SELECT * FROM dependency_chains WHERE task_id = ? ORDER BY depth')
            .bind(taskId)
            .all();

        return result.results as DependencyChain[];
    }

    async getComplexityMetrics(taskId: number): Promise<ComplexityMetrics> {
        const result = await this.db
            .prepare('SELECT * FROM task_complexity_metrics WHERE task_id = ?')
            .bind(taskId)
            .first();

        return result as ComplexityMetrics;
    }

    async analyzeDependencies(taskId: number): Promise<string> {
        const [dependencies, metrics, chain] = await Promise.all([
            this.getDependencies(taskId),
            this.getComplexityMetrics(taskId),
            this.getDependencyChain(taskId)
        ]);

        return this.llm.analyzeDependencies({
            dependencies,
            metrics,
            chain
        });
    }

    async suggestDependencies(taskId: number): Promise<TaskDependency[]> {
        const task = await this.db
            .prepare('SELECT * FROM tasks WHERE id = ?')
            .bind(taskId)
            .first();

        if (!task) {
            throw new Error('Task not found');
        }

        // Get related tasks based on title and description similarity
        const relatedTasks = await this.db
            .prepare(`
                SELECT t.*, 
                    (
                        similarity(t.title, ?) + 
                        similarity(t.description, ?)
                    ) / 2 as similarity_score
                FROM tasks t
                WHERE t.id != ?
                AND t.user_id = ?
                AND t.status != 'completed'
                ORDER BY similarity_score DESC
                LIMIT 5
            `)
            .bind(
                task.title,
                task.description || '',
                taskId,
                task.user_id
            )
            .all();

        // Use LLM to analyze potential dependencies
        const suggestions = await this.llm.suggestDependencies({
            task,
            relatedTasks: relatedTasks.results
        });

        return suggestions;
    }

    async getBlockedTasks(taskId: number): Promise<number[]> {
        const result = await this.db
            .prepare(`
                SELECT DISTINCT task_id
                FROM task_dependencies
                WHERE dependency_id = ?
                AND dependency_type = 'blocks'
            `)
            .bind(taskId)
            .all();

        return result.results.map(r => r.task_id);
    }

    private async wouldCreateCircularDependency(
        taskId: number,
        dependencyId: number
    ): Promise<boolean> {
        // Check if the dependency would create a cycle in the dependency chain
        const result = await this.db
            .prepare(`
                WITH RECURSIVE chain AS (
                    -- Start with the proposed dependency
                    SELECT dependency_id, task_id, 1 as depth
                    FROM task_dependencies
                    WHERE task_id = ?
                    
                    UNION ALL
                    
                    -- Follow the chain
                    SELECT d.dependency_id, d.task_id, c.depth + 1
                    FROM task_dependencies d
                    JOIN chain c ON d.task_id = c.dependency_id
                    WHERE c.depth < 10
                )
                SELECT COUNT(*) as cycle_exists
                FROM chain
                WHERE dependency_id = ?
            `)
            .bind(dependencyId, taskId)
            .first();

        return (result?.cycle_exists || 0) > 0;
    }

    async updateTaskStatus(taskId: number, status: string): Promise<void> {
        if (status === 'completed') {
            // Check if this task blocks any other tasks
            const blockedTasks = await this.getBlockedTasks(taskId);
            
            // Update the status of previously blocked tasks
            if (blockedTasks.length > 0) {
                await this.db
                    .prepare(`
                        UPDATE tasks
                        SET status = 'ready'
                        WHERE id IN (
                            SELECT t.id
                            FROM tasks t
                            LEFT JOIN task_dependencies d ON t.id = d.task_id
                            LEFT JOIN tasks dt ON d.dependency_id = dt.id
                            WHERE t.id IN (${blockedTasks.join(',')})
                            GROUP BY t.id
                            HAVING COUNT(CASE WHEN dt.status != 'completed' THEN 1 END) = 0
                        )
                    `)
                    .run();
            }
        }
    }
}
