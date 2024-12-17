import { Router } from 'itty-router';
import { TaskDependencyService } from '../services/task_dependencies';
import { LLMService } from '../services/llm';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

export function createTaskDependencyRouter(env: Env): Router {
    const router = Router({ base: '/api/tasks' });
    const llmService = new LLMService(env.DB);
    const dependencyService = new TaskDependencyService(env.DB, llmService);

    // Add a dependency
    router.post('/:taskId/dependencies', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const data = await request.json();

            await dependencyService.addDependency({
                task_id: taskId,
                ...data,
            });

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Remove a dependency
    router.delete('/:taskId/dependencies/:dependencyId', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const dependencyId = parseInt(request.params.dependencyId);

            await dependencyService.removeDependency(taskId, dependencyId);

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Get dependencies for a task
    router.get('/:taskId/dependencies', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const dependencies = await dependencyService.getDependencies(taskId);

            return new Response(JSON.stringify(dependencies), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Get dependency chain for a task
    router.get('/:taskId/dependency-chain', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const chain = await dependencyService.getDependencyChain(taskId);

            return new Response(JSON.stringify(chain), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Get complexity metrics for a task
    router.get('/:taskId/complexity', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const metrics = await dependencyService.getComplexityMetrics(taskId);

            return new Response(JSON.stringify(metrics), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Analyze dependencies for a task
    router.get('/:taskId/analysis', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const analysis = await dependencyService.analyzeDependencies(taskId);

            return new Response(JSON.stringify({ analysis }), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Get dependency suggestions for a task
    router.get('/:taskId/suggestions', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const suggestions = await dependencyService.suggestDependencies(taskId);

            return new Response(JSON.stringify(suggestions), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    // Update task status and handle dependency implications
    router.patch('/:taskId/status', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const { status } = await request.json();

            await dependencyService.updateTaskStatus(taskId, status);

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders,
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders,
            });
        }
    });

    return router;
}
