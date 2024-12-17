export interface ProductivityInsight {
    type: 'success' | 'challenge' | 'pattern' | 'suggestion';
    title: string;
    description: string;
    confidence: number;
    actionable: boolean;
    suggestedAction?: string;
}

export interface PerformanceDataPoint {
    date: string;
    completionRate: number;
    focusTime: number;
    productivityScore: number;
}

export interface TaskAnalytics {
    completionRate: number;
    averageCompletionTime: number;
    averageFocusTime: number;
    productivityScore: number;
    peakPerformanceHours: { hour: number; productivity: number }[];
    cognitiveLoadDistribution: { load: string; percentage: number }[];
    contextSwitchingPatterns: { from: string; to: string; frequency: number }[];
    energyPatterns: { hour: number; level: number }[];
    performanceData: PerformanceDataPoint[];
    insights: ProductivityInsight[];
}
