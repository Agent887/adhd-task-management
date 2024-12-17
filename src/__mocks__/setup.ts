// Mock Cloudflare environment
class MockResponse implements Response {
    private _body: any;
    readonly headers: Headers;
    readonly ok: boolean;
    readonly redirected: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly type: ResponseType;
    readonly url: string;
    readonly bodyUsed: boolean;
    readonly body: ReadableStream | null;
    readonly bytes: () => Promise<Uint8Array>;

    constructor(body?: BodyInit | null, init?: ResponseInit) {
        this._body = body;
        this.headers = new Headers(init?.headers);
        this.status = init?.status || 200;
        this.statusText = init?.statusText || '';
        this.ok = this.status >= 200 && this.status < 300;
        this.redirected = false;
        this.type = 'default';
        this.url = '';
        this.bodyUsed = false;
        this.body = null;
        this.bytes = async () => new Uint8Array();
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error('Not implemented');
    }

    async blob(): Promise<Blob> {
        throw new Error('Not implemented');
    }

    async formData(): Promise<FormData> {
        throw new Error('Not implemented');
    }

    async json(): Promise<any> {
        return typeof this._body === 'string' ? JSON.parse(this._body) : this._body;
    }

    async text(): Promise<string> {
        return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
    }

    clone(): Response {
        return new MockResponse(this._body, {
            status: this.status,
            headers: this.headers,
            statusText: this.statusText
        });
    }

    static error(): Response {
        return new MockResponse(null, { status: 500 });
    }

    static json(data: any, init?: ResponseInit): Response {
        return new MockResponse(JSON.stringify(data), {
            ...init,
            headers: {
                ...init?.headers,
                'Content-Type': 'application/json'
            }
        });
    }

    static redirect(url: string | URL, status?: number): Response {
        return new MockResponse(null, {
            status: status || 302,
            headers: { Location: url.toString() }
        });
    }
}

class MockHeaders implements Headers {
    private headers: Map<string, string> = new Map();

    constructor(init?: HeadersInit) {
        if (init instanceof Headers) {
            init.forEach((value, key) => this.headers.set(key.toLowerCase(), value));
        } else if (Array.isArray(init)) {
            init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
        } else if (init) {
            Object.entries(init).forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
        }
    }

    append(name: string, value: string): void {
        const existing = this.headers.get(name.toLowerCase());
        this.headers.set(name.toLowerCase(), existing ? `${existing}, ${value}` : value);
    }

    delete(name: string): void {
        this.headers.delete(name.toLowerCase());
    }

    get(name: string): string | null {
        return this.headers.get(name.toLowerCase()) || null;
    }

    has(name: string): boolean {
        return this.headers.has(name.toLowerCase());
    }

    set(name: string, value: string): void {
        this.headers.set(name.toLowerCase(), value);
    }

    forEach(callbackfn: (value: string, key: string, parent: Headers) => void): void {
        this.headers.forEach((value, key) => callbackfn(value, key, this));
    }

    *entries(): IterableIterator<[string, string]> {
        yield* this.headers.entries();
    }

    *keys(): IterableIterator<string> {
        yield* this.headers.keys();
    }

    *values(): IterableIterator<string> {
        yield* this.headers.values();
    }

    [Symbol.iterator](): IterableIterator<[string, string]> {
        return this.entries();
    }

    getSetCookie(): string[] {
        const cookies = this.get('set-cookie');
        return cookies ? cookies.split(', ') : [];
    }
}

// Set up global mocks
global.Response = MockResponse as any;
global.Headers = MockHeaders as any;

export {
    MockResponse,
    MockHeaders
};

export {};
