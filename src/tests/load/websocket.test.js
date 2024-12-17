import ws from 'k6/ws';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const wsErrorRate = new Rate('websocket_errors');

export const options = {
    stages: [
        { duration: '30s', target: 50 },  // Ramp up to 50 concurrent connections
        { duration: '1m', target: 50 },   // Stay at 50 for 1 minute
        { duration: '30s', target: 0 },   // Ramp down to 0
    ],
    thresholds: {
        'websocket_errors': ['rate<0.1'], // Error rate must be less than 10%
    },
};

const BASE_WS_URL = __ENV.WS_URL || 'ws://localhost:3000/ws';

export default function() {
    const url = `${BASE_WS_URL}?userId=load-test-user-${__VU}`;
    
    const res = ws.connect(url, {}, function(socket) {
        socket.on('open', () => {
            console.log('Connected');

            // Subscribe to notifications
            socket.send(JSON.stringify({
                type: 'subscribe',
                channel: 'notifications',
                userId: `load-test-user-${__VU}`
            }));

            // Subscribe to task updates
            socket.send(JSON.stringify({
                type: 'subscribe',
                channel: 'task_updates',
                userId: `load-test-user-${__VU}`
            }));
        });

        socket.on('message', (data) => {
            const message = JSON.parse(data);
            check(message, {
                'message has type': (msg) => msg.type !== undefined,
                'message has payload': (msg) => msg.payload !== undefined,
            }) || wsErrorRate.add(1);
        });

        socket.on('close', () => console.log('Disconnected'));

        // Simulate real-time interactions
        socket.setInterval(() => {
            // Send energy level update
            socket.send(JSON.stringify({
                type: 'energy_update',
                userId: `load-test-user-${__VU}`,
                level: Math.random()
            }));
        }, 5000);

        socket.setTimeout(() => {
            socket.close();
        }, 60000);
    });

    check(res, { 'status is 101': (r) => r && r.status === 101 });
}
