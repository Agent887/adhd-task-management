import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';
import { createTimeAnalysisRouter } from './time_analysis';
import { createEnergyTrackingRouter } from './energy_tracking';
import { createAnalyticsRouter } from './analytics';
import { createContextSwitchingRouter } from './context_switching';
import { createCollaborationRouter } from './collaboration';
import { createCalendarRouter } from './calendar';
import { createCalendarSyncRouter } from './calendar_sync';
import { Env } from '../types/env';

export function createMainRouter(env: Env): Router {
    const router = Router();

    // CORS preflight
    router.options('*', () => new Response(null, { headers: corsHeaders }));

    // Health check
    router.get('/api/health', () => new Response('OK'));

    // Mount sub-routers
    router.all('/api/time/*', authenticateRequest, createTimeAnalysisRouter(env).handle);
    router.all('/api/energy/*', authenticateRequest, createEnergyTrackingRouter(env).handle);
    router.all('/api/analytics/*', authenticateRequest, createAnalyticsRouter(env).handle);
    router.all('/api/context/*', authenticateRequest, createContextSwitchingRouter(env).handle);
    router.all('/api/collaboration/*', authenticateRequest, createCollaborationRouter(env).handle);
    router.all('/api/calendar/*', authenticateRequest, createCalendarRouter(env).handle);
    router.all('/api/calendar-sync/*', authenticateRequest, createCalendarSyncRouter(env).handle);

    // 404 handler
    router.all('*', () => new Response('Not Found', { status: 404 }));

    return router;
}
