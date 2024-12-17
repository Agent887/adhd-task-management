import { useUserMetrics } from '../hooks/useUserMetrics';

interface OpenRouterConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
}

export class OpenRouterAPI {
  private static instance: OpenRouterAPI;
  private config: OpenRouterConfig;
  private baseUrl = 'https://openrouter.ai/api/v1';

  private constructor() {
    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: 'mistralai/mistral-7b-instruct', // Default model
      maxTokens: 500,
      temperature: 0.7,
    };
  }

  public static getInstance(): OpenRouterAPI {
    if (!OpenRouterAPI.instance) {
      OpenRouterAPI.instance = new OpenRouterAPI();
    }
    return OpenRouterAPI.instance;
  }

  private async makeRequest(endpoint: string, body: any): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.message}`);
    }

    return response;
  }

  public async analyzeTask(taskDescription: string): Promise<{
    complexity: number;
    estimatedTime: number;
    suggestedBreakdown: string[];
  }> {
    const prompt = `
      Analyze this task and provide:
      1. Complexity score (0-100)
      2. Estimated time in minutes
      3. Suggested breakdown into smaller steps

      Task: ${taskDescription}
    `;

    const response = await this.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a task analysis expert. Provide concise, structured analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const data: OpenRouterResponse = await response.json();
    const analysis = data.choices[0].message.content;

    // Parse the response
    const lines = analysis.split('\n');
    const complexity = parseInt(lines[0].match(/\d+/)?.[0] || '50');
    const estimatedTime = parseInt(lines[1].match(/\d+/)?.[0] || '30');
    const breakdown = lines.slice(2).filter(line => line.trim().length > 0);

    return {
      complexity,
      estimatedTime,
      suggestedBreakdown: breakdown,
    };
  }

  public async suggestPriority(
    task: string,
    context: string,
    userMetrics: ReturnType<typeof useUserMetrics>
  ): Promise<{
    priority: number;
    reasoning: string;
  }> {
    const prompt = `
      Given this task and context, suggest a priority score (0-100) and explain why:
      
      Task: ${task}
      Current Context: ${context}
      User Energy Level: ${userMetrics.metrics.energyLevel}
      User Focus Level: ${userMetrics.metrics.focusLevel}
    `;

    const response = await this.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a priority assessment expert. Provide a priority score and brief explanation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const data: OpenRouterResponse = await response.json();
    const analysis = data.choices[0].message.content;

    // Parse the response
    const priorityMatch = analysis.match(/\d+/);
    const priority = priorityMatch ? parseInt(priorityMatch[0]) : 50;
    const reasoning = analysis.replace(/^\d+\s*/, '').trim();

    return {
      priority,
      reasoning,
    };
  }

  public async optimizeSchedule(
    tasks: string[],
    userMetrics: ReturnType<typeof useUserMetrics>
  ): Promise<{
    orderedTasks: string[];
    reasoning: string;
  }> {
    const prompt = `
      Optimize this task schedule considering the user's current state:
      
      Tasks:
      ${tasks.join('\n')}
      
      Energy Level: ${userMetrics.metrics.energyLevel}
      Focus Level: ${userMetrics.metrics.focusLevel}
      
      Provide:
      1. Optimized task order
      2. Brief explanation of the ordering
    `;

    const response = await this.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a schedule optimization expert. Order tasks for maximum efficiency.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const data: OpenRouterResponse = await response.json();
    const analysis = data.choices[0].message.content;

    // Parse the response
    const [orderSection, reasoningSection] = analysis.split(/\n\n/);
    const orderedTasks = orderSection
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, ''));

    return {
      orderedTasks,
      reasoning: reasoningSection.trim(),
    };
  }

  public setModel(model: string): void {
    this.config.model = model;
  }

  public setMaxTokens(maxTokens: number): void {
    this.config.maxTokens = maxTokens;
  }

  public setTemperature(temperature: number): void {
    this.config.temperature = temperature;
  }
}
