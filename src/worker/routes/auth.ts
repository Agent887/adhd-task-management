import { Router } from 'itty-router';
import { createToken } from '../middleware/auth';
import { LoginCredentials, RegisterCredentials, User } from '../../types/auth';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../utils/password';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2),
});

export function createAuthRouter() {
  const router = Router({ base: '/auth' });

  // Login endpoint
  router.post('/login', async (request) => {
    try {
      const credentials: LoginCredentials = await request.json();
      const parsed = loginSchema.parse(credentials);

      // In production, fetch user from database
      const user: User = {
        id: '1',
        email: parsed.email,
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      const token = await createToken(user);

      return new Response(
        JSON.stringify({
          user,
          token,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  });

  // Register endpoint
  router.post('/register', async (request) => {
    try {
      const credentials: RegisterCredentials = await request.json();
      const parsed = registerSchema.parse(credentials);

      const hashedPassword = await hashPassword(parsed.password);

      // In production, save user to database
      const user: User = {
        id: '1',
        email: parsed.email,
        name: parsed.name,
        createdAt: new Date().toISOString(),
      };

      const token = await createToken(user);

      return new Response(
        JSON.stringify({
          user,
          token,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid registration data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  });

  return router;
}
