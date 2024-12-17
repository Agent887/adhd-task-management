import { createAnalyticsRouter } from '../analytics';
import { AnalyticsService } from '../../services/analytics_service';
import { MockD1Database } from '../../__mocks__/d1';
import { Env } from '../../types/env';
import { ProductivityInsight } from '../../types/analytics';

describe('Analytics Router', () => {
    let mockDb: MockD1Database;
    let env: Env;

    beforeEach(() => {
        mockDb = new MockD1Database();
        env = {
            DB: mockDb,
        };
    });

    it('should return analytics and insights for authenticated user', async () => {
        const router = createAnalyticsRouter(env);
        const mockRequest = {
            user: { id: 'test-user-id' },
            query: { timeRange: 'week' }
        };

        // Mock sample analytics data
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

        // Mock insights data
        const mockInsights: ProductivityInsight[] = [
            {
                type: 'pattern',
                title: 'Peak Performance Time',
                description: 'You perform best during morning hours',
                confidence: 0.85,
                actionable: true,
                suggestedAction: 'Schedule complex tasks between 9-11 AM'
            }
        ];

        // Mock the service methods
        jest.spyOn(AnalyticsService.prototype, 'getTaskAnalytics')
            .mockResolvedValue(mockAnalytics);
        jest.spyOn(AnalyticsService.prototype, 'generateInsights')
            .mockResolvedValue(mockInsights);

        const response = await router.handle(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            analytics: mockAnalytics,
            insights: mockInsights
        });
    });

    it('should handle errors gracefully', async () => {
        const router = createAnalyticsRouter(env);
        const mockRequest = {
            user: { id: 'test-user-id' },
            query: { timeRange: 'week' }
        };

        // Mock error in service
        jest.spyOn(AnalyticsService.prototype, 'getTaskAnalytics')
            .mockRejectedValue(new Error('Database error'));

        const response = await router.handle(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
            error: 'Failed to get analytics'
        });
    });

    it('should use default timeRange when not specified', async () => {
        const router = createAnalyticsRouter(env);
        const mockRequest = {
            user: { id: 'test-user-id' },
            query: {}
        };

        const getTaskAnalyticsSpy = jest.spyOn(AnalyticsService.prototype, 'getTaskAnalytics')
            .mockResolvedValue({} as any);

        await router.handle(mockRequest);

        expect(getTaskAnalyticsSpy).toHaveBeenCalledWith('test-user-id', 'week');
    });
});
