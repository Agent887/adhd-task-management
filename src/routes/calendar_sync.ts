import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';
import { CalendarIntegrationService } from '../services/calendar_integration';
import { EnergyPatternService } from '../services/energy_patterns';
import { ScheduleSyncService } from '../services/schedule_sync';

interface Env {
    DB: D1Database;
}

export function createCalendarSyncRouter(env: Env): Router {
    const router = Router({ base: '/api/calendar' });
    const calendarService = new CalendarIntegrationService(env.DB);
    const energyService = new EnergyPatternService(env.DB);
    const scheduleSync = new ScheduleSyncService(calendarService, energyService, env.DB);

    // Get calendar auth URL
    router.get('/auth-url', authenticateRequest, async (request) => {
        try {
            const authUrl = await calendarService.getAuthUrl();
            return new Response(JSON.stringify({ url: authUrl }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting auth URL:', error);
            return new Response(JSON.stringify({ error: 'Failed to get auth URL' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Handle OAuth callback
    router.get('/callback', async (request) => {
        try {
            const url = new URL(request.url);
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');

            if (!code || !state) {
                throw new Error('Missing required parameters');
            }

            await calendarService.handleCallback(code, state);

            // Redirect to settings page
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': '/settings/calendar'
                }
            });
        } catch (error) {
            console.error('Error handling callback:', error);
            return new Response(JSON.stringify({ error: 'Failed to handle callback' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Check connection status
    router.get('/status', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const connected = await calendarService.isConnected(userId);
            
            return new Response(JSON.stringify({ connected }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error checking status:', error);
            return new Response(JSON.stringify({ error: 'Failed to check status' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Sync calendar
    router.post('/sync', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const today = new Date();
            
            await scheduleSync.syncEnergyAwareSchedule(userId, today);

            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error syncing calendar:', error);
            return new Response(JSON.stringify({ error: 'Failed to sync calendar' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get sync summary
    router.get('/summary', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const date = new Date();
            
            const summary = await scheduleSync.getScheduleSummary(userId, date);

            return new Response(JSON.stringify(summary), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting sync summary:', error);
            return new Response(JSON.stringify({ error: 'Failed to get sync summary' }), {
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
