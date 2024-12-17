export class MockD1Database {
    private mockData: any = {};

    async prepare(query: string) {
        return {
            bind: (...params: any[]) => ({
                first: async () => this.mockData.first || {},
                all: async () => ({ results: this.mockData.all || [] }),
                raw: async () => this.mockData.raw || [],
            }),
            first: async () => this.mockData.first || {},
            all: async () => ({ results: this.mockData.all || [] }),
            raw: async () => this.mockData.raw || [],
        };
    }

    setMockData(data: any) {
        this.mockData = data;
    }

    async batch(statements: any[]) {
        return statements.map(() => ({ success: true }));
    }

    async exec(query: string) {
        return { success: true };
    }
}
