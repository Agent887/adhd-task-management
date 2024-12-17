import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { authenticateRequest } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

export function createVisualizationRouter(env: Env): Router {
    const router = Router({ base: '/api/visualization' });

    // Get task visualization data
    router.get('/tasks', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            
            // Get tasks with their dependencies, context information, and energy levels
            const tasks = await env.DB.prepare(`
                SELECT 
                    t.id,
                    t.title,
                    t.status,
                    t.cognitive_load,
                    t.completed_at,
                    t.energy_level,
                    tc.context_id as context_category,
                    GROUP_CONCAT(td.dependency_id) as dependencies
                FROM tasks t
                LEFT JOIN task_contexts tc ON t.id = tc.task_id
                LEFT JOIN task_dependencies td ON t.id = td.task_id
                WHERE t.user_id = ?
                GROUP BY t.id
            `).bind(userId).all();

            // Process task data
            const processedTasks = tasks.results.map(task => ({
                id: task.id,
                title: task.title,
                status: task.status,
                cognitiveLoad: task.cognitive_load,
                contextCategory: task.context_category || 'uncategorized',
                dependencies: task.dependencies ? task.dependencies.split(',') : [],
                completedAt: task.completed_at,
                energyLevel: task.energy_level
            }));

            return new Response(JSON.stringify(processedTasks), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error fetching visualization data:', error);
            return new Response(JSON.stringify({ error: 'Failed to fetch visualization data' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get energy distribution data
    router.get('/energy', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            
            const energyData = await env.DB.prepare(`
                SELECT 
                    strftime('%H', completed_at) as hour,
                    AVG(energy_level) as avg_energy,
                    COUNT(*) as task_count
                FROM tasks
                WHERE user_id = ? 
                    AND completed_at IS NOT NULL 
                    AND energy_level IS NOT NULL
                GROUP BY strftime('%H', completed_at)
                ORDER BY hour
            `).bind(userId).all();

            return new Response(JSON.stringify(energyData.results), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error fetching energy data:', error);
            return new Response(JSON.stringify({ error: 'Failed to fetch energy data' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    });

    // Get context analysis data
    router.get('/contexts', authenticateRequest, async (request) => {
        try {
            const userId = request.user.id;
            
            // Get context categories with their task counts and average cognitive load
            const contextMetrics = await env.DB.prepare(`
                SELECT 
                    cc.id as context_id,
                    cc.name as context_name,
                    COUNT(DISTINCT tc.task_id) as task_count,
                    AVG(t.cognitive_load) as avg_cognitive_load
                FROM context_categories cc
                LEFT JOIN task_contexts tc ON cc.id = tc.context_id
                LEFT JOIN tasks t ON tc.task_id = t.id
                WHERE t.user_id = ?
                GROUP BY cc.id
            `).bind(userId).all();

            // Get context switching patterns
            const switchingPatterns = await env.DB.prepare(`
                SELECT 
                    tc1.context_id as from_context,
                    tc2.context_id as to_context,
                    COUNT(*) as switch_count,
                    AVG(cs.perceived_difficulty) as avg_difficulty
                FROM context_switches cs
                JOIN task_contexts tc1 ON cs.from_task_id = tc1.task_id
                JOIN task_contexts tc2 ON cs.to_task_id = tc2.task_id
                WHERE cs.user_id = ?
                GROUP BY tc1.context_id, tc2.context_id
            `).bind(userId).all();

            return new Response(JSON.stringify({
                contextMetrics: contextMetrics.results,
                switchingPatterns: switchingPatterns.results
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error fetching context data:', error);
            return new Response(JSON.stringify({ error: 'Failed to fetch context data' }), {
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
