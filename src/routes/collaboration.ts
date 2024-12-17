import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';
import { CollaborationService } from '../services/collaboration';

interface Env {
    DB: D1Database;
}

export function createCollaborationRouter(env: Env): Router {
    const router = Router({ base: '/api/collaboration' });
    const collaborationService = new CollaborationService(env.DB);

    // Add a collaborator
    router.post('/partners', authenticateRequest, async (request) => {
        try {
            const { email, role } = await request.json();
            const userId = request.user.id;

            const partner = await collaborationService.addCollaborator(userId, email, role);

            return new Response(JSON.stringify(partner), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error adding collaborator:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Share a task
    router.post('/tasks/:taskId/share', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const { partnerIds } = await request.json();
            const userId = request.user.id;

            await collaborationService.shareTask(taskId, userId, partnerIds);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error sharing task:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Update task progress
    router.post('/tasks/:taskId/progress', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const { progress, message } = await request.json();
            const userId = request.user.id;

            await collaborationService.updateTaskProgress(taskId, userId, progress, message);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error updating progress:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Add a comment to a task
    router.post('/tasks/:taskId/comments', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const { content, type } = await request.json();
            const userId = request.user.id;

            const comment = await collaborationService.addTaskComment(
                taskId,
                userId,
                content,
                type
            );

            return new Response(JSON.stringify(comment), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error adding comment:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get shared tasks
    router.get('/tasks', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const tasks = await collaborationService.getSharedTasks(userId);

            return new Response(JSON.stringify(tasks), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting shared tasks:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get task comments
    router.get('/tasks/:taskId/comments', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const comments = await collaborationService.getTaskComments(taskId);

            return new Response(JSON.stringify(comments), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting comments:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get task progress history
    router.get('/tasks/:taskId/progress', authenticateRequest, async (request) => {
        try {
            const { taskId } = request.params;
            const history = await collaborationService.getProgressHistory(taskId);

            return new Response(JSON.stringify(history), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting progress history:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    return router;
}
