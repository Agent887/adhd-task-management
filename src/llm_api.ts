import axios from 'axios';
import { OpenRouterMessage, OpenRouterResponse, OpenRouterError } from './types';

const llmApi = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': 'Bearer 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',
    'HTTP-Referer': 'https://done365.app',
    'X-Title': 'Done365 ADHD Task Manager',
    'Content-Type': 'application/json'
  },
  timeout: 45000 // 45 second timeout for the more powerful model
});

// Add response interceptor for better error handling
llmApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const apiError = error.response.data as OpenRouterError;
      console.error('OpenRouter API Error:', {
        status: error.response.status,
        error: apiError.error,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('OpenRouter API Request Error:', {
        message: error.message,
        config: error.config
      });
    }
    throw error;
  }
);

// Model constants
export const MODELS = {
  LLAMA_70B: 'meta-llama/llama-3.3-70b-instruct',
  LLAMA_7B: 'meta-llama/llama-2-7b-chat-hf'
} as const;

// API helper functions
export async function createChatCompletion(
  model: string,
  messages: OpenRouterMessage[],
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<OpenRouterResponse> {
  try {
    const response = await llmApi.post<OpenRouterResponse>('/chat/completions', {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to create chat completion with model ${model}:`, error);
    throw error;
  }
}

export { llmApi };
