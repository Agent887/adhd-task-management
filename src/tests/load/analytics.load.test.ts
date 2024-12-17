import http from 'k6/http';
import { sleep, check } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
    stages: [
        { duration: '30s', target: 20 }, // Ramp up to 20 users
        { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
        { duration: '30s', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
        http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
    },
};

const BASE_URL = 'http://localhost:8787'; // Update this with your dev server URL
const TEST_USER_ID = 'test-user-123';     // Update with a test user ID

export default function () {
    // Test analytics endpoints
    const analyticsTests = [
        // Get analytics with different time ranges
        () => {
            const dayResponse = http.get(`${BASE_URL}/api/analytics?timeRange=day&userId=${TEST_USER_ID}`);
            check(dayResponse, {
                'day analytics status is 200': (r) => r.status === 200,
                'day analytics has data': (r) => r.json('analytics') !== null,
            });
        },
        () => {
            const weekResponse = http.get(`${BASE_URL}/api/analytics?timeRange=week&userId=${TEST_USER_ID}`);
            check(weekResponse, {
                'week analytics status is 200': (r) => r.status === 200,
                'week analytics has data': (r) => r.json('analytics') !== null,
            });
        },
        () => {
            const monthResponse = http.get(`${BASE_URL}/api/analytics?timeRange=month&userId=${TEST_USER_ID}`);
            check(monthResponse, {
                'month analytics status is 200': (r) => r.status === 200,
                'month analytics has data': (r) => r.json('analytics') !== null,
            });
        },

        // Test insights endpoint
        () => {
            const insightsResponse = http.get(`${BASE_URL}/api/analytics/insights?userId=${TEST_USER_ID}`);
            check(insightsResponse, {
                'insights status is 200': (r) => r.status === 200,
                'insights has data': (r) => r.json('insights') !== null,
            });
        },

        // Test performance metrics endpoint
        () => {
            const performanceResponse = http.get(`${BASE_URL}/api/analytics/performance?userId=${TEST_USER_ID}`);
            check(performanceResponse, {
                'performance status is 200': (r) => r.status === 200,
                'performance has data': (r) => r.json('metrics') !== null,
            });
        },
    ];

    // Execute each test with a small delay between them
    analyticsTests.forEach((test) => {
        test();
        sleep(1);
    });

    // Add a random sleep between 1-5 seconds to simulate real user behavior
    sleep(Math.random() * 4 + 1);
}
