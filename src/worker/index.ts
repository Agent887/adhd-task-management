import { Router } from 'itty-router';
import { createAuthRouter } from './routes/auth';
import { corsMiddleware } from './middleware/cors';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

const router = Router();

// Add CORS middleware
router.all('*', corsMiddleware);

// Mount auth routes
router.all('/auth/*', createAuthRouter().handle);

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
