import { Router } from 'itty-router';
import { CalendarIntegrationService } from '../services/calendar_integration';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

export function createCalendarRouter(env: Env): Router {
    const router = Router({ base: '/api/calendar' });
    const calendarService = new CalendarIntegrationService(env.DB);

    // Get Google OAuth URL
    router.get('/auth/url', authenticateRequest, async (request) => {
        try {
            const authUrl = await calendarService.getAuthUrl();
            return new Response(JSON.stringify({ url: authUrl }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Handle OAuth callback
    router.get('/auth/callback', authenticateRequest, async (request) => {
        try {
            const { code } = request.query;
            const userId = request.user.id;

            await calendarService.handleCallback(code as string, userId);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Create calendar event for task
    router.post('/events', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const taskData = await request.json();

            const eventId = await calendarService.createTaskEvent(userId, taskData);

            return new Response(JSON.stringify({ eventId }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Update calendar event
    router.put('/events/:taskId', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const { taskId } = request.params;
            const updates = await request.json();

            await calendarService.updateTaskEvent(userId, taskId, updates);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Delete calendar event
    router.delete('/events/:taskId', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const { taskId } = request.params;

            await calendarService.deleteTaskEvent(userId, taskId);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get upcoming events
    router.get('/events/upcoming', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const { days } = request.query;

            const events = await calendarService.getUpcomingEvents(
                userId,
                parseInt(days as string) || 7
            );

            return new Response(JSON.stringify({ events }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
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
