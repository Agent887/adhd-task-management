import { Router } from 'itty-router';
import { DatabaseService } from '../services/database';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';

export function createTaskRouter(env: Env): Router {
    const router = Router({ base: '/api/tasks' });
    const db = new DatabaseService(env.DB);

    // Get task by ID
    router.get('/:taskId', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const task = await db.getTask(taskId);

            if (!task) {
                return new Response('Task not found', { 
                    status: 404,
                    headers: corsHeaders
                });
            }

            return new Response(JSON.stringify(task), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting task:', error);
            return new Response(JSON.stringify({ error: 'Failed to get task' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Update task
    router.patch('/:taskId', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const updates = await request.json();

            const updatedTask = await db.updateTask(taskId, updates);
            if (!updatedTask) {
                return new Response('Task not found', { 
                    status: 404,
                    headers: corsHeaders
                });
            }

            return new Response(JSON.stringify(updatedTask), {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error updating task:', error);
            return new Response(JSON.stringify({ error: 'Failed to update task' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Delete task
    router.delete('/:taskId', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            await db.deleteTask(taskId);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error deleting task:', error);
            return new Response(JSON.stringify({ error: 'Failed to delete task' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    return router;
}
