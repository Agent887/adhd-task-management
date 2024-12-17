import { Router } from 'itty-router';
import { corsHeaders } from './utils/cors';
import { authenticateRequest } from './middleware/auth';
import { createTimeAnalysisRouter } from './routes/time_analysis';
import { createEnergyTrackingRouter } from './routes/energy_tracking';
import { createAnalyticsRouter } from './routes/analytics';
import { createContextSwitchingRouter } from './routes/context_switching';
import { createCollaborationRouter } from './routes/collaboration';
import { createCalendarRouter } from './routes/calendar';
import { createCalendarSyncRouter } from './routes/calendar_sync';
import { Env } from './types/env';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const router = Router();

        // CORS preflight
        router.options('*', () => new Response(null, {
            headers: corsHeaders
        }));

        // Health check
        router.get('/health', () => new Response('OK'));
        
        // Mount sub-routers
        router.all('/api/time/*', authenticateRequest(env), createTimeAnalysisRouter(env).handle);
        router.all('/api/energy/*', authenticateRequest(env), createEnergyTrackingRouter(env).handle);
        router.all('/api/analytics/*', authenticateRequest(env), createAnalyticsRouter(env).handle);
        router.all('/api/context/*', authenticateRequest(env), createContextSwitchingRouter(env).handle);
        router.all('/api/collaboration/*', authenticateRequest(env), createCollaborationRouter(env).handle);
        router.all('/api/calendar/*', authenticateRequest(env), createCalendarRouter(env).handle);
        router.all('/api/calendar-sync/*', authenticateRequest(env), createCalendarSyncRouter(env).handle);

        // Handle 404
        router.all('*', () => new Response('Not Found', { status: 404 }));

        try {
            return await router.handle(request);
        } catch (error) {
            console.error('Error handling request:', error);
            return new Response('Internal Server Error', {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};
