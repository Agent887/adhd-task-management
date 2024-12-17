import { Router } from 'itty-router';
import { TimeAnalysisService } from '../services/time_analysis';
import { LLMService } from '../services/llm';
import { PreferencesService } from '../services/preferences';
import { TimeBlock, TaskCompletionPattern } from '../types';
import { validateTimeBlock, validateCompletionData } from '../utils/validators';

export function createTimeAnalysisRouter(
    db: D1Database,
    cache: KVNamespace
): Router {
    const router = new Router();
    const llmService = new LLMService(cache);
    const preferencesService = new PreferencesService(db);
    const timeAnalysisService = new TimeAnalysisService(db, llmService, preferencesService);

    // Record task completion with energy levels and focus data
    router.post('/api/tasks/:taskId/completion', async (req) => {
        try {
            const { taskId } = req.params;
            const userId = req.headers.get('X-User-Id');
            if (!userId) {
                return new Response('Unauthorized', { status: 401 });
            }

            const completionData: Partial<TaskCompletionPattern> = await req.json();
            if (!validateCompletionData(completionData)) {
                return new Response('Invalid completion data', { status: 400 });
            }

            await timeAnalysisService.recordTaskCompletion(taskId, userId, completionData);
            return new Response('Task completion recorded', { status: 200 });
        } catch (error) {
            console.error('Error recording task completion:', error);
            return new Response('Internal server error', { status: 500 });
        }
    });

    // Manage time blocks (user's preferred working hours)
    router.post('/api/time-blocks', async (req) => {
        try {
            const userId = req.headers.get('X-User-Id');
            if (!userId) {
                return new Response('Unauthorized', { status: 401 });
            }

            const timeBlock: TimeBlock = await req.json();
            if (!validateTimeBlock(timeBlock)) {
                return new Response('Invalid time block data', { status: 400 });
            }

            await timeAnalysisService.updateTimeBlock(userId, timeBlock);
            return new Response('Time block updated', { status: 200 });
        } catch (error) {
            console.error('Error updating time block:', error);
            return new Response('Internal server error', { status: 500 });
        }
    });

    // Get user's time blocks
    router.get('/api/time-blocks', async (req) => {
        try {
            const userId = req.headers.get('X-User-Id');
            if (!userId) {
                return new Response('Unauthorized', { status: 401 });
            }

            const timeBlocks = await timeAnalysisService.getTimeBlocks(userId);
            return new Response(JSON.stringify(timeBlocks), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error getting time blocks:', error);
            return new Response('Internal server error', { status: 500 });
        }
    });

    // Get time recommendations for a task
    router.get('/api/tasks/:taskId/recommendations', async (req) => {
        try {
            const { taskId } = req.params;
            const userId = req.headers.get('X-User-Id');
            if (!userId) {
                return new Response('Unauthorized', { status: 401 });
            }

            const task = await db
                .prepare('SELECT * FROM tasks WHERE id = ?')
                .bind(taskId)
                .first();

            if (!task) {
                return new Response('Task not found', { status: 404 });
            }

            const recommendations = await timeAnalysisService.generateTimeRecommendations(task, userId);
            return new Response(JSON.stringify(recommendations), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error getting time recommendations:', error);
            return new Response('Internal server error', { status: 500 });
        }
    });

    // Get task completion patterns
    router.get('/api/tasks/:taskId/patterns', async (req) => {
        try {
            const { taskId } = req.params;
            const userId = req.headers.get('X-User-Id');
            if (!userId) {
                return new Response('Unauthorized', { status: 401 });
            }

            const patterns = await db
                .prepare(`
                    SELECT * FROM task_completion_patterns 
                    WHERE task_id = ? AND user_id = ?
                    ORDER BY completed_at DESC
                    LIMIT 10
                `)
                .bind(taskId, userId)
                .all();

            return new Response(JSON.stringify(patterns.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error getting completion patterns:', error);
            return new Response('Internal server error', { status: 500 });
        }
    });

    return router;
}
