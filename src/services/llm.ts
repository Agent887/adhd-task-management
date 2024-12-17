import { Task, TaskAnalysis, UserPreferences, TimeAnalysisRequest } from '../types';
import { CacheService } from './cache';
import { PreferencesService } from './preferences';
import llmApi, { MODELS, createChatCompletion } from '../llm_api';

export class LLMService {
    constructor(
        private cache: CacheService,
        private preferences: PreferencesService
    ) {}

    async analyzeTask(task: Task, userId: string): Promise<TaskAnalysis> {
        // Check cache first
        const cached = await this.cache.getCachedTaskAnalysis(task.id);
        if (cached) {
            return cached;
        }

        // Get user preferences for customized analysis
        const prefs = await this.preferences.getUserPreferences(userId);
        
        const analysis = await this.performTaskAnalysis(task, prefs);
        
        // Cache the result
        await this.cache.cacheTaskAnalysis(task.id, analysis);
        
        return analysis;
    }

    private async performTaskAnalysis(task: Task, prefs: UserPreferences): Promise<TaskAnalysis> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant specialized in analyzing tasks for people with ADHD.
                Consider the following user preferences:
                - Preferred task chunk duration: ${prefs.preferred_task_chunk_duration} minutes
                - Break duration: ${prefs.break_duration} minutes
                - Task breakdown detail level: ${prefs.task_breakdown_detail}
                - Maximum daily cognitive load: ${prefs.max_daily_cognitive_load}
                
                Analyze the task and provide:
                1. Estimated total duration in minutes
                2. Overall cognitive load (1-10)
                3. Detailed steps with cognitive load per step
                4. Relevant tags
                5. ADHD-specific challenges and mitigation strategies
                
                Format your response in a structured way that can be parsed into JSON.`
            },
            {
                role: 'user',
                content: `
                Analyze this task for someone with ADHD:
                Title: ${task.title}
                Description: ${task.description}
                Priority: ${task.priority}
                Current Tags: ${task.tags.join(', ')}
                
                Consider:
                - Task initiation difficulty
                - Sustained attention requirements
                - Working memory demands
                - Executive function needs
                - Time management aspects
                - Context switching costs
                - Decision fatigue factors`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return this.parseAnalysisResponse(response.choices[0].message.content);
        } catch (error) {
            console.error('Error analyzing task:', error);
            throw new Error('Failed to analyze task: ' + error.message);
        }
    }

    private parseAnalysisResponse(content: string): TaskAnalysis {
        try {
            // Basic structure expected in the response
            const lines = content.split('\n');
            const analysis: TaskAnalysis = {
                task_id: '',  // Will be set by the caller
                duration_minutes: 0,
                cognitive_load: 0,
                steps: [],
                tags: [],
                challenges: []
            };

            let currentSection = '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('DURATION:')) {
                    analysis.duration_minutes = parseInt(trimmed.split(':')[1].trim());
                } else if (trimmed.startsWith('COGNITIVE_LOAD:')) {
                    analysis.cognitive_load = parseInt(trimmed.split(':')[1].trim());
                } else if (trimmed.startsWith('STEPS:')) {
                    currentSection = 'steps';
                } else if (trimmed.startsWith('TAGS:')) {
                    analysis.tags = trimmed.split(':')[1].split(',').map(t => t.trim());
                } else if (trimmed.startsWith('CHALLENGES:')) {
                    currentSection = 'challenges';
                } else if (trimmed && currentSection === 'steps' && /^\d+\./.test(trimmed)) {
                    const [desc, execFunc] = trimmed.split('(Executive Function:').map(s => s.trim());
                    const step: TaskStep = {
                        description: desc.replace(/^\d+\.\s*/, ''),
                        executive_function: execFunc ? execFunc.replace(')', '') : 'General',
                        cognitive_load: 5,  // Default value
                        estimated_duration: Math.floor(analysis.duration_minutes / 4)  // Rough estimate
                    };
                    analysis.steps.push(step);
                } else if (trimmed && currentSection === 'challenges' && /^\d+\./.test(trimmed)) {
                    const [challenge, mitigation] = trimmed.split(':').map(s => s.trim());
                    analysis.challenges.push({
                        challenge: challenge.replace(/^\d+\.\s*/, ''),
                        mitigation: mitigation || '',
                        impact_level: 5  // Default value
                    });
                }
            }

            return analysis;
        } catch (error) {
            console.error('Error parsing analysis response:', error);
            throw new Error('Failed to parse analysis response: ' + error.message);
        }
    }

    async analyzeBatch(tasks: Task[], userId: string): Promise<Map<string, TaskAnalysis>> {
        // Check cache for all tasks
        const cachedAnalyses = await this.cache.getCachedTaskAnalyses(tasks.map(t => t.id));
        const uncachedTasks = tasks.filter(t => !cachedAnalyses.has(t.id));

        if (uncachedTasks.length === 0) {
            return cachedAnalyses;
        }

        // Get user preferences once for all tasks
        const prefs = await this.preferences.getUserPreferences(userId);

        // Analyze uncached tasks in parallel
        const newAnalyses = await Promise.all(
            uncachedTasks.map(task => this.performTaskAnalysis(task, prefs))
        );

        // Cache new analyses
        const newAnalysesMap = new Map<string, TaskAnalysis>();
        uncachedTasks.forEach((task, index) => {
            const analysis = newAnalyses[index];
            analysis.task_id = task.id;
            newAnalysesMap.set(task.id, analysis);
        });
        await this.cache.cacheTaskAnalyses(newAnalysesMap);

        // Combine cached and new analyses
        return new Map([...cachedAnalyses, ...newAnalysesMap]);
    }

    async analyzeTimePatterns(data: TimeAnalysisRequest): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant specialized in analyzing task completion patterns for people with ADHD.
                Consider the user's preferences, historical patterns, and time blocks to suggest optimal times for task completion.
                
                Format your recommendations exactly like this for each suggested time slot:
                DAY: [day of week]
                TIME: [HH:MM format]
                CONFIDENCE: [0.0-1.0]
                REASONING: [explanation of why this time is recommended]
                
                Provide 2-3 recommendations, ordered by confidence score.`
            },
            {
                role: 'user',
                content: `
                Analyze this task and suggest optimal times:
                Task: ${data.task.title}
                Description: ${data.task.description}
                Priority: ${data.task.priority}
                Estimated Duration: ${data.task.estimated_duration} minutes
                
                User Preferences:
                Peak Start: ${data.preferences.peak_start_time}
                Peak End: ${data.preferences.peak_end_time}
                Max Cognitive Load: ${data.preferences.max_daily_cognitive_load}
                Preferred Task Duration: ${data.preferences.preferred_task_chunk_duration} minutes
                
                Available Time Blocks:
                ${data.timeBlocks.map(block => `
                    ${this.getDayName(block.day_of_week)}:
                    ${block.start_time}-${block.end_time}
                    Energy: ${block.energy_level}/5
                    Focus: ${block.focus_level}/5
                    Preferred Tasks: ${block.preferred_task_types.join(', ')}
                `).join('\n')}
                
                Historical Completion Patterns:
                ${data.patterns.map(pattern => `
                    Completed: ${pattern.completed_at}
                    Day: ${this.getDayName(pattern.day_of_week)}
                    Time: ${pattern.time_of_day}
                    Energy: ${pattern.energy_level}/5
                    Focus: ${pattern.focus_level}/5
                    Duration: ${pattern.completion_duration} minutes
                    Interruptions: ${pattern.interruption_count}
                    Satisfaction: ${pattern.satisfaction_rating}/5
                `).join('\n')}
                
                Consider:
                1. User's peak hours and energy levels
                2. Historical success patterns
                3. Task complexity and cognitive demands
                4. Available time blocks
                5. Potential interruptions
                6. ADHD-specific challenges
                
                Provide 2-3 recommended time slots with confidence scores and reasoning.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing time patterns:', error);
            throw new Error('Failed to analyze time patterns: ' + error.message);
        }
    }

    async analyzeEnergyTrends(data: {
        patterns: any[];
        influencers: any[];
        recentLevels: any[];
    }): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant specialized in analyzing energy and focus patterns for people with ADHD.
                Analyze the patterns and provide insights in the following format:

                PATTERNS:
                1. [Pattern description]
                2. [Pattern description]
                ...

                INFLUENCING FACTORS:
                1. [Factor]: [Impact description]
                2. [Factor]: [Impact description]
                ...

                RECOMMENDATIONS:
                1. [Actionable recommendation]
                2. [Actionable recommendation]
                ...

                FOCUS AREAS:
                1. [Area for improvement]
                2. [Area for improvement]
                ...`
            },
            {
                role: 'user',
                content: `
                Analyze these energy patterns and provide insights:

                Energy Patterns:
                ${data.patterns.map(p => `
                    Day: ${this.getDayName(p.day_of_week)}
                    Hour: ${p.hour}:00
                    Avg Energy: ${p.avg_energy_level}/5
                    Avg Focus: ${p.avg_focus_level}/5
                    Confidence: ${p.confidence_score}
                `).join('\n')}

                Energy Influencers:
                ${data.influencers.map(i => `
                    Factor: ${i.factor_type}
                    Impact: ${i.impact_level}
                    Description: ${i.description}
                    Frequency: ${i.frequency}
                `).join('\n')}

                Recent Energy Levels:
                ${data.recentLevels.map(l => `
                    Time: ${l.timestamp}
                    Energy: ${l.energy_level}/5
                    Focus: ${l.focus_level}/5
                    Mood: ${l.mood}
                    Stress: ${l.stress_level}/5
                    Sleep: ${l.sleep_quality}/5
                    Medication: ${l.medication_taken ? 'Yes' : 'No'}
                    Notes: ${l.notes || 'None'}
                `).join('\n')}

                Consider:
                1. Daily and weekly patterns
                2. Impact of different factors
                3. Sleep and medication effects
                4. Stress level correlations
                5. Environmental influences
                6. ADHD-specific challenges

                Provide detailed analysis with actionable recommendations.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing energy trends:', error);
            throw new Error('Failed to analyze energy trends: ' + error.message);
        }
    }

    async analyzeDependencies(data: {
        dependencies: any[];
        metrics: any;
        chain: any[];
    }): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant specialized in analyzing task dependencies and providing insights for ADHD users.
                Consider:
                1. Complexity of dependency chains
                2. Potential bottlenecks
                3. Risk factors
                4. Suggestions for optimization
                5. ADHD-specific challenges
                
                Format your response in sections:
                COMPLEXITY ANALYSIS:
                [Analysis of the dependency structure]
                
                BOTTLENECKS:
                [Identified bottlenecks and risks]
                
                ADHD CONSIDERATIONS:
                [Specific challenges and considerations for ADHD]
                
                RECOMMENDATIONS:
                [Actionable suggestions for managing dependencies]`
            },
            {
                role: 'user',
                content: `Analyze these task dependencies:

                Dependencies:
                ${JSON.stringify(data.dependencies, null, 2)}

                Complexity Metrics:
                ${JSON.stringify(data.metrics, null, 2)}

                Dependency Chains:
                ${JSON.stringify(data.chain, null, 2)}

                Consider the impact on ADHD users and provide actionable insights.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing dependencies:', error);
            throw new Error('Failed to analyze dependencies: ' + error.message);
        }
    }

    async suggestDependencies(data: {
        task: any;
        relatedTasks: any[];
    }): Promise<any[]> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant that helps identify potential task dependencies.
                For each related task, determine if and how it might be dependent on or related to the main task.
                Consider:
                1. Sequential dependencies
                2. Resource dependencies
                3. Logical relationships
                4. Impact on cognitive load
                
                Return your suggestions in this format:
                [
                    {
                        "task_id": number,
                        "dependency_type": "blocks" | "required_for" | "enhances" | "related",
                        "impact_level": number (1-5),
                        "notes": "Explanation of the relationship"
                    }
                ]`
            },
            {
                role: 'user',
                content: `Analyze potential dependencies for this task:

                Main Task:
                ${JSON.stringify(data.task, null, 2)}

                Related Tasks:
                ${JSON.stringify(data.relatedTasks, null, 2)}

                Suggest logical dependencies and relationships between these tasks.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('Error suggesting dependencies:', error);
            throw new Error('Failed to suggest dependencies: ' + error.message);
        }
    }

    async analyzeSwitchingCost(data: {
        fromContexts: any[];
        toContexts: any[];
        cost: number;
        recoveryTime: number;
        energyLevel: number;
        timeOfDay: string;
    }): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant specialized in analyzing context switching costs for ADHD users.
                Consider:
                1. Current energy levels
                2. Time of day
                3. Context similarity/difference
                4. ADHD-specific challenges
                
                Provide a recommendation in this format:
                SWITCH ASSESSMENT:
                [Brief assessment of the switch difficulty]
                
                ADHD CONSIDERATIONS:
                [Specific ADHD-related factors]
                
                RECOMMENDATION:
                [Whether to proceed with the switch, and how to manage it]
                
                TIPS:
                - [Specific tips for managing this switch]
                - [More tips...]`
            },
            {
                role: 'user',
                content: `Analyze this context switch:

                From Contexts:
                ${JSON.stringify(data.fromContexts, null, 2)}

                To Contexts:
                ${JSON.stringify(data.toContexts, null, 2)}

                Calculated Cost: ${data.cost}
                Recovery Time: ${data.recoveryTime} minutes
                Current Energy Level: ${data.energyLevel}/5
                Time of Day: ${data.timeOfDay}

                Provide specific recommendations for managing this context switch.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing switching cost:', error);
            throw new Error('Failed to analyze switching cost: ' + error.message);
        }
    }

    async analyzeContextSwitchingPatterns(data: {
        metrics: any[];
        preferences: any[];
    }): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant that analyzes context switching patterns for ADHD users.
                Consider:
                1. Frequency of switches
                2. Impact on energy and focus
                3. Planned vs unplanned switches
                4. User preferences
                5. ADHD-specific patterns
                
                Format your analysis as:
                PATTERN SUMMARY:
                [Overview of switching patterns]
                
                IMPACT ANALYSIS:
                [Analysis of how switches affect the user]
                
                ADHD INSIGHTS:
                [ADHD-specific observations]
                
                OPTIMIZATION SUGGESTIONS:
                [Actionable recommendations]`
            },
            {
                role: 'user',
                content: `Analyze these context switching patterns:

                Metrics:
                ${JSON.stringify(data.metrics, null, 2)}

                User Preferences:
                ${JSON.stringify(data.preferences, null, 2)}

                Provide insights and recommendations for optimizing context switching.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing switching patterns:', error);
            throw new Error('Failed to analyze switching patterns: ' + error.message);
        }
    }

    async suggestOptimalSwitchingTimes(data: {
        taskContexts: any[];
        userPrefs: any[];
        energyPatterns: any[];
        currentTask: any;
    }): Promise<{
        optimal_times: string[];
        reasoning: string;
    }> {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant that suggests optimal times for context switching.
                Consider:
                1. Task contexts and requirements
                2. User's energy patterns
                3. Preferred working hours
                4. ADHD-specific needs
                
                Return your response in this format:
                {
                    "optimal_times": ["time1", "time2", ...],
                    "reasoning": "Detailed explanation of the suggestions"
                }`
            },
            {
                role: 'user',
                content: `Suggest optimal switching times for this task:

                Task Contexts:
                ${JSON.stringify(data.taskContexts, null, 2)}

                User Preferences:
                ${JSON.stringify(data.userPrefs, null, 2)}

                Energy Patterns:
                ${JSON.stringify(data.energyPatterns, null, 2)}

                Current Task:
                ${JSON.stringify(data.currentTask, null, 2)}

                Consider the user's ADHD needs and provide specific time suggestions.`
            }
        ];

        try {
            const response = await createChatCompletion(
                MODELS.LLAMA_70B,
                messages,
                0.7,
                1000
            );

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('Error suggesting switching times:', error);
            throw new Error('Failed to suggest switching times: ' + error.message);
        }
    }

    private getDayName(day: number): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day] || 'Unknown';
    }
}
