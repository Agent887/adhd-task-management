import { Router } from 'itty-router';
import { ContextSwitchingService } from '../services/context_switching';
import { LLMService } from '../services/llm';
import { EnergyTrackingService } from '../services/energy_tracking';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

export function createContextSwitchingRouter(env: Env): Router {
    const router = Router({ base: '/api/context' });
    const llmService = new LLMService(env.DB);
    const energyService = new EnergyTrackingService(env.DB, llmService);
    const contextService = new ContextSwitchingService(env.DB, llmService, energyService);

    // Record a context switch
    router.post('/switch', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const data = await request.json();
            
            await contextService.recordContextSwitch(userId, data);
            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    // Get task contexts
    router.get('/tasks/:taskId/contexts', authenticateRequest, async (request) => {
        try {
            const taskId = parseInt(request.params.taskId);
            const contexts = await contextService.getTaskContexts(taskId);
            
            return new Response(JSON.stringify(contexts), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    // Calculate switching cost
    router.get('/cost', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const { fromTaskId, toTaskId } = request.query;
            
            const cost = await contextService.calculateSwitchingCost(
                parseInt(fromTaskId),
                parseInt(toTaskId),
                userId
            );
            
            return new Response(JSON.stringify(cost), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    // Get user context preferences
    router.get('/preferences', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const preferences = await contextService.getUserContextPreferences(userId);
            
            return new Response(JSON.stringify(preferences), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    // Update user context preferences
    router.put('/preferences', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const preferences = await request.json();
            
            await contextService.updateUserContextPreferences(userId, preferences);
            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    // Analyze context switching patterns
    router.get('/analysis', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const analysis = await contextService.analyzeContextSwitchingPatterns(userId);
            
            return new Response(JSON.stringify({ analysis }), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    // Get optimal switching times
    router.get('/tasks/:taskId/optimal-times', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const taskId = parseInt(request.params.taskId);
            
            const times = await contextService.suggestOptimalSwitchingTimes(userId, taskId);
            return new Response(JSON.stringify(times), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: corsHeaders
            });
        }
    });

    return router;
}
