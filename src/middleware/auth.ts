import { corsHeaders } from '../utils/cors';
import { Env } from '../types/env';

interface User {
    id: string;
    name: string;
    email: string;
}

declare global {
    interface Request {
        user?: User;
    }
}

export const authenticateRequest = (env: Env) => async (request: Request) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized', {
            status: 401,
            headers: corsHeaders
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        // Here you would validate the token and get user info
        // For now, we'll mock a user
        const user: User = {
            id: '1',
            name: 'Test User',
            email: 'test@example.com'
        };
        
        // Attach user to request object
        request.user = user;
        
        return null; // Continue to next middleware/handler
    } catch (error) {
        return new Response('Invalid token', {
            status: 401,
            headers: corsHeaders
        });
    }
};
