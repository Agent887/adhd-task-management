import { sign, verify } from '@tsndr/cloudflare-worker-jwt';
import { User } from '../../types/auth';

const JWT_SECRET = 'your-secret-key'; // Move to environment variable in production

export interface AuthRequest extends Request {
  user?: User;
}

export async function createToken(user: User): Promise<string> {
  return await sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const payload = await verify(token, JWT_SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      createdAt: new Date().toISOString(), // This should come from the database
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  request: AuthRequest,
  env: any,
  ctx: ExecutionContext
): Promise<Response | void> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const user = await verifyToken(token);

  if (!user) {
    return new Response('Invalid token', { status: 401 });
  }

  request.user = user;
}
