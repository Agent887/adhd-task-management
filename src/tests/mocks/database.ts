import { jest } from '@jest/globals';

export const mockD1Database = () => ({
    prepare: jest.fn(),
    batch: jest.fn(),
    exec: jest.fn(),
    dump: jest.fn(),
    transaction: jest.fn()
});

export const mockD1Result = (results: any[] = []) => ({
    results,
    success: true,
    error: null,
    meta: {}
});

export const mockPreparedStatement = (results: any[] = []) => ({
    bind: jest.fn().mockReturnValue({
        all: jest.fn().mockResolvedValue(mockD1Result(results)),
        first: jest.fn().mockResolvedValue(results[0] || null),
        raw: jest.fn().mockResolvedValue(results),
        run: jest.fn().mockResolvedValue(mockD1Result())
    })
});
