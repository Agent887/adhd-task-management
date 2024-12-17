export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    cognitiveLoad?: number;
    userId: string;
    priority: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskAnalysis {
    taskId: string;
    estimatedDuration: number;
    suggestedCognitiveLoad: number;
    breakdownSteps: string[];
    suggestedTags: string[];
    createdAt: Date;
}

export interface UserPreferences {
    userId: string;
    peakHours: string[]; // Array of hour strings in 24h format, e.g. ["09:00", "10:00"]
    uiComplexity: 'simple' | 'moderate' | 'detailed';
    notificationPreferences: {
        email: boolean;
        push: boolean;
        frequency: 'low' | 'medium' | 'high';
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskCompletionRecord {
    id: string;
    taskId: string;
    userId: string;
    completedAt: Date;
    cognitiveState: {
        energyLevel: number;
        stressLevel: number;
        focusLevel: number;
    };
    environmentFactors: {
        location?: string;
        noise?: number;
        interruptions?: number;
    };
    successRating: number;
}

export interface Env {
    DB: D1Database;
    CACHE: KVNamespace;
    AI: any; // Cloudflare AI binding
}

// OpenRouter API Types
export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenRouterChoice {
    message: {
        content: string;
        role: string;
    };
    finish_reason: string;
}

export interface OpenRouterResponse {
    id: string;
    choices: OpenRouterChoice[];
    model: string;
    object: string;
    created: number;
}

export interface OpenRouterError {
    error: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
}

export interface UserPreferences {
    user_id: string;
    peak_start_time: string;
    peak_end_time: string;
    max_daily_cognitive_load: number;
    preferred_task_chunk_duration: number;
    break_duration: number;
    ui_complexity_level: 'minimal' | 'balanced' | 'detailed';
    notification_frequency: 'low' | 'medium' | 'high';
    task_breakdown_detail: 'low' | 'medium' | 'high';
    created_at?: string;
    updated_at?: string;
}

export interface PeakHours {
    id?: number;
    user_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    cognitive_capacity: number;
}

export interface TaskPreferences {
    id?: number;
    user_id: string;
    task_type: string;
    preferred_time_of_day?: 'morning' | 'afternoon' | 'evening';
    max_duration?: number;
    min_break_after?: number;
}

// Enhanced task analysis types with cognitive load
export interface TaskAnalysis {
    task_id: string;
    duration_minutes: number;
    cognitive_load: number;
    steps: TaskStep[];
    tags: string[];
    challenges: TaskChallenge[];
    cached_at?: string;
}

export interface TaskStep {
    description: string;
    executive_function: string;
    cognitive_load: number;
    estimated_duration: number;
}

export interface TaskChallenge {
    challenge: string;
    mitigation: string;
    impact_level: number;
}

// Cache types for LLM responses
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export interface LLMCacheConfig {
    defaultTTL: number;
    maxEntries: number;
    cleanupInterval: number;
}

// Time-based analysis types
export interface TimeBlock {
    id?: number;
    user_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    energy_level: number;
    focus_level: number;
    preferred_task_types: string[];
    created_at?: string;
}

export interface TaskCompletionPattern {
    id?: number;
    task_id: string;
    user_id: string;
    completed_at: string;
    day_of_week: number;
    time_of_day: string;
    energy_level: number;
    focus_level: number;
    completion_duration?: number;
    interruption_count: number;
    satisfaction_rating: number;
}

export interface TimeRecommendation {
    id?: number;
    task_id: string;
    user_id?: string;
    recommended_day: number;
    recommended_time: string;
    confidence_score: number;
    reasoning: string;
    created_at?: string;
}

export interface TimeAnalysisRequest {
    task: Task;
    patterns: TaskCompletionPattern[];
    timeBlocks: TimeBlock[];
    preferences: UserPreferences;
}
