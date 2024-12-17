import { Router } from 'itty-router';
import { AnalyticsService } from '../services/analytics_service';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';
import { Env } from '../types/env';

export function createAnalyticsRouter(env: Env): Router {
    const router = Router();
    const analyticsService = new AnalyticsService(env.DB);

    // Handle CORS preflight requests
    router.options('*', () => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    });

    // Mock data for testing
    const mockAnalytics = {
        completionRate: 0.75,
        averageCompletionTime: 2.5,
        peakPerformanceHours: [
            { hour: 9, productivity: 0.8 },
            { hour: 14, productivity: 0.9 }
        ],
        cognitiveLoadDistribution: [
            { load: 'low', percentage: 30 },
            { load: 'medium', percentage: 45 },
            { load: 'high', percentage: 25 }
        ],
        contextSwitchingPatterns: [
            { from: 'coding', to: 'meeting', frequency: 5 }
        ],
        energyPatterns: [
            { hour: 9, level: 8 },
            { hour: 14, level: 7 }
        ]
    };

    const mockInsights = [
        {
            type: 'pattern',
            title: 'Peak Performance Time',
            description: 'You perform best during morning hours',
            confidence: 0.85,
            actionable: true,
            suggestedAction: 'Schedule complex tasks between 9-11 AM'
        }
    ];

    // Get task analytics
    router.get('/', async (request) => {
        try {
            // For testing, we'll use mock data instead of the database
            return new Response(JSON.stringify({
                analytics: mockAnalytics,
                insights: mockInsights
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error getting analytics:', error);
            return new Response(JSON.stringify({ 
                error: 'Failed to get analytics',
                details: error.message 
            }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Handle 404 for unmatched routes within /api/analytics
    router.all('*', () => {
        return new Response('Not Found', {
            status: 404,
            headers: corsHeaders
        });
    });

    return router;
}
