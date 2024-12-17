import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { TestContext, setupTestContext, cleanupTestContext } from './setup';

describe('Collaboration Integration', () => {
    let context: TestContext;
    let partnerContext: TestContext;

    beforeAll(async () => {
        // Set up main user context
        context = await setupTestContext();

        // Set up partner context
        partnerContext = await setupTestContext();
        partnerContext.testUser = {
            id: 'test-partner-1',
            email: 'partner@example.com',
            name: 'Test Partner'
        };
    });

    afterAll(async () => {
        await cleanupTestContext(context);
        await cleanupTestContext(partnerContext);
    });

    describe('Support Network Integration', () => {
        it('should establish accountability partnership', async () => {
            // Add accountability partner
            const partner = await context.collaborationService.addCollaborator(
                context.testUser.id,
                partnerContext.testUser.email,
                'accountability'
            );

            // Verify partnership
            expect(partner.role).toBe('accountability');
            expect(partner.permissions).toContain('view_tasks');
            expect(partner.permissions).toContain('send_reminders');
        });

        it('should share tasks with accountability partner', async () => {
            // Create task
            const taskId = 'shared-task-1';
            await context.db.prepare(`
                INSERT INTO tasks (
                    id,
                    user_id,
                    title,
                    description,
                    status
                ) VALUES (?, ?, ?, ?, ?)
            `).bind(
                taskId,
                context.testUser.id,
                'Important Task',
                'Need accountability',
                'in_progress'
            ).run();

            // Share task
            await context.collaborationService.shareTask(
                taskId,
                context.testUser.id,
                [partnerContext.testUser.id]
            );

            // Verify partner can see task
            const partnerTasks = await context.collaborationService.getSharedTasks(
                partnerContext.testUser.id
            );

            expect(partnerTasks).toContainEqual(
                expect.objectContaining({
                    id: taskId,
                    title: 'Important Task'
                })
            );
        });

        it('should allow partners to send encouragement', async () => {
            const taskId = 'shared-task-1';

            // Partner sends encouragement
            const comment = await context.collaborationService.addTaskComment(
                taskId,
                partnerContext.testUser.id,
                'You can do it! 💪',
                'support'
            );

            // Verify comment
            expect(comment.type).toBe('support');
            expect(comment.content).toContain('You can do it!');

            // Verify notification
            const notifications = await new Promise(resolve => {
                context.notificationService.subscribe(notifications => {
                    resolve(notifications);
                });
            });

            expect(notifications).toContainEqual(
                expect.objectContaining({
                    type: 'support',
                    title: expect.stringContaining('Encouragement')
                })
            );
        });
    });

    describe('Progress Sharing', () => {
        it('should notify partners of significant progress', async () => {
            const taskId = 'shared-task-1';

            // Update progress
            await context.collaborationService.updateTaskProgress(
                taskId,
                context.testUser.id,
                50,
                'Halfway there!'
            );

            // Verify progress notification
            const notifications = await new Promise(resolve => {
                partnerContext.notificationService.subscribe(notifications => {
                    resolve(notifications);
                });
            });

            expect(notifications).toContainEqual(
                expect.objectContaining({
                    type: 'progress',
                    metadata: {
                        taskId,
                        progress: 50
                    }
                })
            );
        });

        it('should trigger celebration on task completion', async () => {
            const taskId = 'shared-task-1';

            // Complete task
            await context.collaborationService.updateTaskProgress(
                taskId,
                context.testUser.id,
                100,
                'Done!'
            );

            // Verify celebration notification
            const notifications = await new Promise(resolve => {
                partnerContext.notificationService.subscribe(notifications => {
                    resolve(notifications);
                });
            });

            expect(notifications).toContainEqual(
                expect.objectContaining({
                    type: 'celebration',
                    title: expect.stringContaining('completed')
                })
            );
        });
    });

    describe('Energy-Aware Collaboration', () => {
        it('should share energy insights with accountability partners', async () => {
            // Record low energy
            await context.energyService.recordEnergyLevel(
                context.testUser.id,
                0.3
            );

            // Get break suggestion
            const suggestion = await context.energyService.suggestBreak(
                context.testUser.id
            );

            expect(suggestion.shouldTakeBreak).toBe(true);

            // Verify partner notification
            const notifications = await new Promise(resolve => {
                partnerContext.notificationService.subscribe(notifications => {
                    resolve(notifications);
                });
            });

            expect(notifications).toContainEqual(
                expect.objectContaining({
                    type: 'energy',
                    priority: 'high'
                })
            );
        });

        it('should allow partners to suggest breaks', async () => {
            const taskId = 'shared-task-1';

            // Partner suggests break
            const comment = await context.collaborationService.addTaskComment(
                taskId,
                partnerContext.testUser.id,
                'I notice you\'ve been working hard. Time for a break? 🌟',
                'break'
            );

            // Verify break suggestion
            expect(comment.type).toBe('break');

            // Verify notification
            const notifications = await new Promise(resolve => {
                context.notificationService.subscribe(notifications => {
                    resolve(notifications);
                });
            });

            expect(notifications).toContainEqual(
                expect.objectContaining({
                    type: 'break',
                    title: expect.stringContaining('Break')
                })
            );
        });
    });
});
