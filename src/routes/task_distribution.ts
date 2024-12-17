import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';
import { EnergyPatternService } from '../services/energy_patterns';

interface Env {
    DB: D1Database;
}

export function createTaskDistributionRouter(env: Env): Router {
    const router = Router({ base: '/api/task-distribution' });
    const energyService = new EnergyPatternService(env.DB);

    // Get optimal task distribution
    router.get('/schedule', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;

            // Get all pending tasks
            const tasks = await env.DB.prepare(`
                SELECT 
                    t.id,
                    t.title,
                    t.cognitive_load,
                    t.estimated_energy,
                    t.deadline,
                    tc.context_id as context_category
                FROM tasks t
                LEFT JOIN task_contexts tc ON t.id = tc.task_id
                WHERE t.user_id = ?
                    AND t.status = 'pending'
                ORDER BY t.deadline ASC
            `).bind(userId).all();

            const taskRequirements = tasks.results.map(task => ({
                id: task.id,
                title: task.title,
                estimatedEnergy: task.estimated_energy,
                cognitiveLoad: task.cognitive_load,
                contextCategory: task.context_category,
                deadline: task.deadline ? new Date(task.deadline) : undefined
            }));

            const distribution = await energyService.getOptimalTaskDistribution(
                userId,
                taskRequirements
            );

            // Convert Map to array for JSON response
            const schedule = Array.from(distribution.entries()).map(([hour, tasks]) => ({
                hour,
                tasks
            }));

            return new Response(JSON.stringify(schedule), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error generating task schedule:', error);
            return new Response(JSON.stringify({ error: 'Failed to generate task schedule' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get energy insights
    router.get('/insights', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const insights = await energyService.getEnergyInsights(userId);
            
            return new Response(JSON.stringify({ insights }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error generating energy insights:', error);
            return new Response(JSON.stringify({ error: 'Failed to generate energy insights' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get suggested breaks
    router.get('/breaks', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            const breakHours = await energyService.suggestBreaks(userId);
            
            return new Response(JSON.stringify({ breakHours }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error suggesting breaks:', error);
            return new Response(JSON.stringify({ error: 'Failed to suggest breaks' }), {
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
