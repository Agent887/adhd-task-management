import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '1m', target: 20 }, // Ramp up to 20 users
        { duration: '3m', target: 20 }, // Stay at 20 users
        { duration: '1m', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'], // 95% of requests must complete within 500ms
        'errors': ['rate<0.1'],            // Error rate must be less than 10%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8787';

// Test data
const TEST_USER = {
    id: 'load-test-user',
    email: 'loadtest@example.com'
};

const TASK_TEMPLATE = {
    title: 'Load Test Task',
    description: 'Testing system performance under load',
    estimatedEnergy: 0.7,
    priority: 'medium',
    context: 'work'
};

export function setup() {
    // Create test user if needed
    const res = http.post(`${BASE_URL}/api/users`, JSON.stringify(TEST_USER));
    check(res, {
        'user created': (r) => r.status === 201 || r.status === 409 // 409 if user exists
    });
    return { userId: TEST_USER.id };
}

export default function(data) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${data.userId}`
    };

    // Create task
    const createTask = http.post(
        `${BASE_URL}/api/tasks`,
        JSON.stringify({
            ...TASK_TEMPLATE,
            userId: data.userId,
            title: `${TASK_TEMPLATE.title} ${Date.now()}`
        }),
        { headers }
    );

    check(createTask, {
        'task created': (r) => r.status === 201 || r.status === 200,
        'response time OK': (r) => r.timings.duration < 500
    }) || errorRate.add(1);

    if (createTask.status !== 201 && createTask.status !== 200) {
        console.log(`Task creation failed with status ${createTask.status}: ${createTask.body}`);
    }

    sleep(1);

    // Get task list with analysis
    const getTasks = http.get(
        `${BASE_URL}/api/tasks?userId=${data.userId}&includeAnalysis=true`,
        { headers }
    );

    check(getTasks, {
        'tasks retrieved': (r) => r.status === 200,
        'response time OK': (r) => r.timings.duration < 500,
        'has analysis data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body && (body.tasks || body.analysis);
            } catch (e) {
                console.log(`Failed to parse getTasks response: ${r.body}`);
                return false;
            }
        }
    }) || errorRate.add(1);

    sleep(1);

    // Update task progress
    if (createTask.status === 201 || createTask.status === 200) {
        const taskId = JSON.parse(createTask.body).id;
        const updateTask = http.patch(
            `${BASE_URL}/api/tasks/${taskId}`,
            JSON.stringify({
                progress: 50,
                energyLevel: 0.8
            }),
            { headers }
        );

        check(updateTask, {
            'task updated': (r) => r.status === 200,
            'response time OK': (r) => r.timings.duration < 500
        }) || errorRate.add(1);
    }

    sleep(1);

    // Get analytics
    const getAnalytics = http.get(
        `${BASE_URL}/api/analytics?userId=${data.userId}`,
        { headers }
    );

    check(getAnalytics, {
        'analytics retrieved': (r) => r.status === 200,
        'has insights': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body && body.insights;
            } catch (e) {
                console.log(`Failed to parse analytics response: ${r.body}`);
                return false;
            }
        }
    }) || errorRate.add(1);

    sleep(1);
}
