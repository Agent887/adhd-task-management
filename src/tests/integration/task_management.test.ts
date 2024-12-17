import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { TestContext, setupTestContext, cleanupTestContext } from './setup';

describe('Task Management Integration', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestContext();
    });

    afterAll(async () => {
        await cleanupTestContext(context);
    });

    describe('Task Creation and Energy-Aware Scheduling', () => {
        it('should create task and suggest optimal time based on energy patterns', async () => {
            // Record energy patterns
            await context.energyService.recordEnergyLevel(context.testUser.id, 0.9); // High energy
            
            // Create a high cognitive load task
            const taskData = {
                title: 'Complex Programming Task',
                description: 'Implement new feature requiring deep focus',
                cognitive_load: 'high',
                estimated_duration: 120, // 2 hours
            };

            // Get optimal schedule
            const schedule = await context.energyService.suggestOptimalSchedule(
                context.testUser.id
            );

            // Verify schedule takes energy levels into account
            expect(schedule).toBeDefined();
            const taskSlot = schedule[0];
            expect(taskSlot.energyLevel).toBeGreaterThanOrEqual(0.7);
        });

        it('should adjust schedule when energy levels change', async () => {
            // Record declining energy
            await context.energyService.recordEnergyLevel(context.testUser.id, 0.4);

            // Get updated schedule
            const newSchedule = await context.energyService.suggestOptimalSchedule(
                context.testUser.id
            );

            // Verify schedule adapts to lower energy
            expect(newSchedule[0].energyLevel).toBeLessThan(0.7);
            expect(newSchedule[0].suggestedBreak).toBe(true);
        });
    });

    describe('Task Progress and Collaboration', () => {
        it('should track progress and notify accountability partners', async () => {
            // Add accountability partner
            const partner = await context.collaborationService.addCollaborator(
                context.testUser.id,
                'partner@example.com',
                'accountability'
            );

            // Create task
            const taskId = 'test-task-1';

            // Update progress
            await context.collaborationService.updateTaskProgress(
                taskId,
                context.testUser.id,
                75,
                'Making great progress!'
            );

            // Verify progress update
            const history = await context.collaborationService.getProgressHistory(taskId);
            expect(history[0].newProgress).toBe(75);

            // Verify notification was sent
            const notifications = await new Promise(resolve => {
                context.notificationService.subscribe(notifications => {
                    resolve(notifications);
                });
            });

            expect(notifications).toContainEqual(
                expect.objectContaining({
                    type: 'progress',
                    metadata: {
                        taskId,
                        progress: 75
                    }
                })
            );
        });
    });

    describe('Analytics and Insights', () => {
        it('should generate insights based on task patterns', async () => {
            // Record task completions at different times
            const tasks = [
                { hour: 9, cognitive_load: 'high', completed: true },
                { hour: 10, cognitive_load: 'high', completed: true },
                { hour: 14, cognitive_load: 'medium', completed: false },
                { hour: 15, cognitive_load: 'low', completed: true }
            ];

            // Add tasks to history
            for (const task of tasks) {
                await context.db.prepare(`
                    INSERT INTO tasks (
                        id,
                        user_id,
                        cognitive_load,
                        status,
                        created_at,
                        completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID(),
                    context.testUser.id,
                    task.cognitive_load,
                    task.completed ? 'completed' : 'in_progress',
                    new Date().toISOString(),
                    task.completed ? new Date().toISOString() : null
                ).run();
            }

            // Generate insights
            const insights = await context.analyticsService.generateInsights(
                context.testUser.id
            );

            // Verify insights
            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'success',
                    title: expect.stringContaining('Peak Performance'),
                    confidence: expect.any(Number)
                })
            );

            // Verify peak hours detection
            const analytics = await context.analyticsService.getTaskAnalytics(
                context.testUser.id,
                'day'
            );

            expect(analytics.peakPerformanceHours).toContainEqual(
                expect.objectContaining({
                    hour: 9,
                    productivity: expect.any(Number)
                })
            );
        });
    });

    describe('Context Switching and Break Management', () => {
        it('should detect excessive context switching and suggest breaks', async () => {
            // Simulate rapid context switches
            const contexts = ['coding', 'email', 'coding', 'meeting', 'coding'];
            
            for (const context of contexts) {
                await context.db.prepare(`
                    INSERT INTO tasks (
                        id,
                        user_id,
                        context,
                        status,
                        started_at
                    ) VALUES (?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID(),
                    context.testUser.id,
                    context,
                    'in_progress',
                    new Date().toISOString()
                ).run();
            }

            // Get analytics
            const analytics = await context.analyticsService.getTaskAnalytics(
                context.testUser.id,
                'day'
            );

            // Verify context switching detection
            expect(analytics.contextSwitchingPatterns).toHaveLength(
                expect.any(Number)
            );

            // Check for break suggestions
            const insights = await context.analyticsService.generateInsights(
                context.testUser.id
            );

            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'pattern',
                    title: expect.stringContaining('Context Switching'),
                    actionable: true
                })
            );
        });
    });
});
