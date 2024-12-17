import axios, { AxiosResponse } from 'axios';
import { Task } from '../types/task';
import { CollaborationPartner } from '../types/collaboration';

interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8787/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse<ApiResponse<any>> => {
        // Transform the response data to match our ApiResponse interface
        const transformedResponse = {
            ...response,
            data: {
                data: response.data,
                status: response.status,
                message: response.statusText
            }
        };
        return transformedResponse;
    },
    error => {
        if (error.response) {
            // Handle specific error cases
            switch (error.response.status) {
                case 401:
                    // Handle unauthorized
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                    break;
                case 403:
                    // Handle forbidden
                    break;
                case 404:
                    // Handle not found
                    break;
                case 500:
                    // Handle server error
                    break;
                default:
                    // Handle other errors
                    break;
            }
        }
        return Promise.reject(error);
    }
);

// Type-safe API methods
export const apiService = {
    async getTasks(): Promise<ApiResponse<Task[]>> {
        const response = await api.get<ApiResponse<Task[]>>('/tasks');
        return response.data;
    },

    async getTask(id: string): Promise<ApiResponse<Task>> {
        const response = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
        return response.data;
    },

    async createTask(task: Omit<Task, 'id'>): Promise<ApiResponse<Task>> {
        const response = await api.post<ApiResponse<Task>>('/tasks', task);
        return response.data;
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
        const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, updates);
        return response.data;
    },

    async deleteTask(id: string): Promise<ApiResponse<void>> {
        const response = await api.delete<ApiResponse<void>>(`/tasks/${id}`);
        return response.data;
    },

    async getCollaborators(): Promise<ApiResponse<CollaborationPartner[]>> {
        const response = await api.get<ApiResponse<CollaborationPartner[]>>('/collaborators');
        return response.data;
    }
};

export { api };
