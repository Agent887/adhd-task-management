import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { EnergyPatternService } from '../../services/energy_patterns';
import { mockD1Database } from '../mocks/database';

describe('EnergyPatternService', () => {
    let energyService: EnergyPatternService;
    let mockDb: any;

    beforeEach(() => {
        mockDb = mockD1Database();
        energyService = new EnergyPatternService(mockDb);
    });

    describe('analyzeUserEnergy', () => {
        it('should calculate energy patterns correctly', async () => {
            // Mock energy level data
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({
                        results: [
                            { hour: 9, level: 0.8 },
                            { hour: 10, level: 0.9 },
                            { hour: 14, level: 0.6 },
                            { hour: 15, level: 0.5 },
                        ]
                    })
                })
            });

            const userId = 'test-user';
            const patterns = await energyService.analyzeUserEnergy(userId);

            expect(patterns.peakHours).toEqual([9, 10]);
            expect(patterns.lowEnergyPeriods).toEqual([14, 15]);
            expect(patterns.averageEnergyLevel).toBeCloseTo(0.7);
        });

        it('should handle empty data', async () => {
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({ results: [] })
                })
            });

            const userId = 'test-user';
            const patterns = await energyService.analyzeUserEnergy(userId);

            expect(patterns.peakHours).toEqual([]);
            expect(patterns.lowEnergyPeriods).toEqual([]);
            expect(patterns.averageEnergyLevel).toBe(0);
        });
    });

    describe('suggestOptimalSchedule', () => {
        it('should distribute tasks based on energy levels', async () => {
            // Mock task data
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({
                        results: [
                            { id: 1, cognitive_load: 'high', estimated_duration: 60 },
                            { id: 2, cognitive_load: 'medium', estimated_duration: 30 },
                            { id: 3, cognitive_load: 'low', estimated_duration: 45 },
                        ]
                    })
                })
            });

            // Mock energy patterns
            jest.spyOn(energyService, 'analyzeUserEnergy').mockResolvedValue({
                peakHours: [9, 10],
                lowEnergyPeriods: [14, 15],
                averageEnergyLevel: 0.7
            });

            const userId = 'test-user';
            const schedule = await energyService.suggestOptimalSchedule(userId);

            expect(schedule).toBeDefined();
            expect(schedule.length).toBeGreaterThan(0);
            
            // High cognitive load tasks should be scheduled during peak hours
            const highLoadTask = schedule.find(s => s.taskId === 1);
            expect(highLoadTask?.hour).toBeGreaterThanOrEqual(9);
            expect(highLoadTask?.hour).toBeLessThanOrEqual(10);

            // Low cognitive load tasks should be scheduled during low energy periods
            const lowLoadTask = schedule.find(s => s.taskId === 3);
            expect(lowLoadTask?.hour).toBeGreaterThanOrEqual(14);
            expect(lowLoadTask?.hour).toBeLessThanOrEqual(15);
        });

        it('should handle no tasks', async () => {
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({ results: [] })
                })
            });

            const userId = 'test-user';
            const schedule = await energyService.suggestOptimalSchedule(userId);

            expect(schedule).toEqual([]);
        });
    });

    describe('recordEnergyLevel', () => {
        it('should store energy level readings', async () => {
            const mockInsert = jest.fn().mockResolvedValue({ success: true });
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    run: mockInsert
                })
            });

            const userId = 'test-user';
            const level = 0.8;
            await energyService.recordEnergyLevel(userId, level);

            expect(mockInsert).toHaveBeenCalled();
        });

        it('should validate energy level range', async () => {
            const userId = 'test-user';
            
            await expect(energyService.recordEnergyLevel(userId, 1.5))
                .rejects.toThrow('Energy level must be between 0 and 1');
            
            await expect(energyService.recordEnergyLevel(userId, -0.5))
                .rejects.toThrow('Energy level must be between 0 and 1');
        });
    });

    describe('suggestBreak', () => {
        it('should suggest break when energy is low', async () => {
            // Mock recent energy levels
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({
                        results: [
                            { level: 0.3 },
                            { level: 0.2 },
                            { level: 0.25 }
                        ]
                    })
                })
            });

            const userId = 'test-user';
            const suggestion = await energyService.suggestBreak(userId);

            expect(suggestion.shouldTakeBreak).toBe(true);
            expect(suggestion.reason).toContain('low energy');
        });

        it('should not suggest break when energy is sufficient', async () => {
            mockDb.prepare.mockReturnValueOnce({
                bind: jest.fn().mockReturnValue({
                    all: jest.fn().mockResolvedValue({
                        results: [
                            { level: 0.7 },
                            { level: 0.8 },
                            { level: 0.75 }
                        ]
                    })
                })
            });

            const userId = 'test-user';
            const suggestion = await energyService.suggestBreak(userId);

            expect(suggestion.shouldTakeBreak).toBe(false);
        });
    });
});
