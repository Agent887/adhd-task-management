interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec<T = unknown>(query: string): Promise<D1Result<T>>;
}

interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<Array<T>>;
}

interface D1Result<T = unknown> {
    results?: T[];
    success: boolean;
    error?: string;
    meta?: object;
}

interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
}

interface Env {
    DB: D1Database;
    CACHE: Cache;
    AI: {
        OPENAI_API_KEY: string;
        OPENROUTER_API_KEY: string;
    };
}

export { Env, D1Database, D1PreparedStatement, D1Result, ExecutionContext };
