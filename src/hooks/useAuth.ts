import { useState, useEffect } from 'react';
import { User, LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            validateToken(token);
        } else {
            setLoading(false);
        }
    }, []);

    const validateToken = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                localStorage.setItem('token', token);
            } else {
                localStorage.removeItem('token');
                setUser(null);
            }
        } catch (err) {
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            setError(null);
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data: AuthResponse = await response.json();
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        }
    };

    const register = async (credentials: RegisterCredentials) => {
        try {
            setError(null);
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            const data: AuthResponse = await response.json();
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const getToken = () => {
        return localStorage.getItem('token');
    };

    return {
        user,
        loading,
        error,
        login,
        register,
        logout,
        getToken
    };
}
