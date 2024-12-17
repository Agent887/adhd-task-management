import { Router } from 'itty-router';
import { EnergyTrackingService } from '../services/energy_tracking';
import { LLMService } from '../services/llm';
import { validateEnergyLevel, validateEnergyInfluencer } from '../utils/validators';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

export function createEnergyTrackingRouter(env: Env): Router {
    const router = Router({ base: '/api/energy' });
    const llmService = new LLMService(env.DB);
    const energyService = new EnergyTrackingService(env.DB, llmService);

    // Record current energy level
    router.post('/record', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const data = await request.json();
            
            const validationError = validateEnergyLevel(data);
            if (validationError) {
                return new Response(JSON.stringify({ error: validationError }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            await energyService.recordEnergyLevel(userId, data);
            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    // Get energy patterns
    router.get('/patterns', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const patterns = await energyService.getEnergyPatterns(userId);
            return new Response(JSON.stringify(patterns), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    // Get daily energy report
    router.get('/daily-report', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const { date } = request.query;
            
            if (!date) {
                return new Response(JSON.stringify({ error: 'Date parameter is required' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            const report = await energyService.getDailyEnergyReport(userId, date);
            return new Response(JSON.stringify(report), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    // Record energy influencer
    router.post('/influencers', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const data = await request.json();
            
            const validationError = validateEnergyInfluencer(data);
            if (validationError) {
                return new Response(JSON.stringify({ error: validationError }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            await energyService.recordEnergyInfluencer(userId, data);
            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    // Get energy influencers
    router.get('/influencers', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const influencers = await energyService.getEnergyInfluencers(userId);
            return new Response(JSON.stringify(influencers), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    // Get energy trend analysis
    router.get('/analysis', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const analysis = await energyService.analyzeEnergyTrends(userId);
            return new Response(JSON.stringify({ analysis }), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    // Get peak energy times
    router.get('/peak-times', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const peakTimes = await energyService.getPeakEnergyTimes(userId);
            return new Response(JSON.stringify(peakTimes), {
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    });

    return router;
}
