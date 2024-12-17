import { jest } from '@jest/globals';

// Mock WebSocket for notification service
global.WebSocket = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn()
}));

// Mock crypto for UUID generation
global.crypto = {
    randomUUID: jest.fn(() => 'test-uuid'),
    // Add other required crypto methods as needed
} as any;

// Setup timezone for consistent date handling
process.env.TZ = 'UTC';

// Add custom matchers if needed
expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
});
