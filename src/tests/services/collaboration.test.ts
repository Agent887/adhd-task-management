import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { CollaborationService } from '../../services/collaboration';
import { mockD1Database } from '../mocks/database';

describe('CollaborationService', () => {
    let collaborationService: CollaborationService;
    let mockDb: any;

    beforeEach(() => {
        mockDb = mockD1Database();
        collaborationService = new CollaborationService(mockDb);
    });

    describe('addCollaborator', () => {
        it('should add new collaborator successfully', async () => {
            // Mock user exists
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue({
                        id: 'partner-id',
                        name: 'Test Partner',
                        email: 'partner@test.com'
                    })
                })
            });

            // Mock collaboration insert
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    run: jest.fn().mockResolvedValue({ success: true })
                })
            });

            const userId = 'test-user';
            const partnerEmail = 'partner@test.com';
            const role = 'accountability';

            const partner = await collaborationService.addCollaborator(
                userId,
                partnerEmail,
                role
            );

            expect(partner).toBeDefined();
            expect(partner.email).toBe(partnerEmail);
            expect(partner.role).toBe(role);
        });

        it('should send invitation for non-existent user', async () => {
            // Mock user doesn't exist
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(null)
                })
            });

            const userId = 'test-user';
            const partnerEmail = 'newuser@test.com';
            const role = 'support';

            await expect(collaborationService.addCollaborator(userId, partnerEmail, role))
                .rejects.toThrow('User not found. Invitation sent.');
        });
    });

    describe('shareTask', () => {
        it('should share task with partners', async () => {
            // Mock task ownership check
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue({ id: 'task-id' })
                })
            });

            // Mock share insert
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    run: jest.fn().mockResolvedValue({ success: true })
                })
            });

            const taskId = 'task-id';
            const userId = 'test-user';
            const partnerIds = ['partner-1', 'partner-2'];

            await collaborationService.shareTask(taskId, userId, partnerIds);
            expect(mockDb.prepare).toHaveBeenCalledTimes(2);
        });

        it('should fail if user does not own task', async () => {
            // Mock task ownership check fails
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(null)
                })
            });

            const taskId = 'task-id';
            const userId = 'test-user';
            const partnerIds = ['partner-1'];

            await expect(collaborationService.shareTask(taskId, userId, partnerIds))
                .rejects.toThrow('Task not found or unauthorized');
        });
    });

    describe('updateTaskProgress', () => {
        it('should update task progress and notify partners', async () => {
            // Mock current progress fetch
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue({ progress: 50 })
                })
            });

            // Mock progress update
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    run: jest.fn().mockResolvedValue({ success: true })
                })
            });

            const taskId = 'task-id';
            const userId = 'test-user';
            const progress = 75;

            await collaborationService.updateTaskProgress(taskId, userId, progress);
            expect(mockDb.prepare).toHaveBeenCalledTimes(2);
        });

        it('should validate progress value', async () => {
            const taskId = 'task-id';
            const userId = 'test-user';

            await expect(collaborationService.updateTaskProgress(taskId, userId, 150))
                .rejects.toThrow('Progress must be between 0 and 100');
        });
    });

    describe('addTaskComment', () => {
        it('should add comment successfully', async () => {
            const mockComment = {
                id: 'comment-id',
                task_id: 'task-id',
                user_id: 'test-user',
                content: 'Test comment',
                type: 'progress',
                timestamp: new Date().toISOString()
            };

            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(mockComment)
                })
            });

            const taskId = 'task-id';
            const userId = 'test-user';
            const content = 'Test comment';
            const type = 'progress';

            const comment = await collaborationService.addTaskComment(
                taskId,
                userId,
                content,
                type
            );

            expect(comment).toBeDefined();
            expect(comment.content).toBe(content);
            expect(comment.type).toBe(type);
        });
    });

    describe('getSharedTasks', () => {
        it('should return tasks shared with user', async () => {
            const mockTasks = [
                {
                    id: 'task-1',
                    title: 'Test Task 1',
                    owner: 'test-user',
                    progress: 50,
                    shared_with: 'partner-1,partner-2'
                },
                {
                    id: 'task-2',
                    title: 'Test Task 2',
                    owner: 'partner-1',
                    progress: 75,
                    shared_with: 'test-user'
                }
            ];

            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({ results: mockTasks })
                })
            });

            const userId = 'test-user';
            const tasks = await collaborationService.getSharedTasks(userId);

            expect(tasks).toHaveLength(2);
            expect(tasks[0].sharedWith).toEqual(['partner-1', 'partner-2']);
        });
    });

    describe('getProgressHistory', () => {
        it('should return task progress history', async () => {
            const mockUpdates = [
                {
                    task_id: 'task-1',
                    user_id: 'test-user',
                    new_progress: 75,
                    old_progress: 50,
                    message: 'Good progress!',
                    timestamp: new Date().toISOString()
                }
            ];

            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({ results: mockUpdates })
                })
            });

            const taskId = 'task-1';
            const history = await collaborationService.getProgressHistory(taskId);

            expect(history).toHaveLength(1);
            expect(history[0].newProgress).toBe(75);
            expect(history[0].oldProgress).toBe(50);
        });
    });
});
