import { TimeBlock, TaskCompletionPattern } from '../types';

export function validateTimeBlock(data: any): data is TimeBlock {
    if (!data || typeof data !== 'object') return false;

    return (
        typeof data.day_of_week === 'number' &&
        data.day_of_week >= 0 &&
        data.day_of_week <= 6 &&
        typeof data.start_time === 'string' &&
        typeof data.end_time === 'string' &&
        typeof data.energy_level === 'number' &&
        data.energy_level >= 1 &&
        data.energy_level <= 5 &&
        typeof data.focus_level === 'number' &&
        data.focus_level >= 1 &&
        data.focus_level <= 5 &&
        Array.isArray(data.preferred_task_types)
    );
}

export function validateCompletionData(data: any): data is Partial<TaskCompletionPattern> {
    if (!data || typeof data !== 'object') return false;

    // Required fields
    if (
        typeof data.energy_level !== 'number' ||
        data.energy_level < 1 ||
        data.energy_level > 5 ||
        typeof data.focus_level !== 'number' ||
        data.focus_level < 1 ||
        data.focus_level > 5
    ) {
        return false;
    }

    // Optional fields
    if (
        'completion_duration' in data &&
        (typeof data.completion_duration !== 'number' || data.completion_duration < 0)
    ) {
        return false;
    }

    if (
        'interruption_count' in data &&
        (typeof data.interruption_count !== 'number' || data.interruption_count < 0)
    ) {
        return false;
    }

    if (
        'satisfaction_rating' in data &&
        (typeof data.satisfaction_rating !== 'number' ||
            data.satisfaction_rating < 1 ||
            data.satisfaction_rating > 5)
    ) {
        return false;
    }

    return true;
}

export function validateTimeString(time: string): boolean {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
}

export function validateEnergyLevel(level: number): boolean {
    return level >= 1 && level <= 10;
}

export function validateFocusLevel(level: number): boolean {
    return level >= 1 && level <= 10;
}

export function validateTaskTypes(types: string[]): boolean {
    const validTypes = [
        'focus',
        'creative',
        'routine',
        'physical',
        'social',
        'planning',
        'learning'
    ];
    return types.every(type => validTypes.includes(type));
}

export function validateEnergyData(data: any): string | null {
    if (!data) {
        return 'Energy level data is required';
    }

    if (typeof data.level !== 'number' || data.level < 1 || data.level > 10) {
        return 'Energy level must be a number between 1 and 10';
    }

    if (data.timestamp && typeof data.timestamp !== 'string') {
        return 'Timestamp must be a string';
    }

    if (data.factors !== undefined) {
        if (!Array.isArray(data.factors)) {
            return 'Factors must be an array';
        }

        const validFactors = [
            'sleep',
            'medication',
            'exercise',
            'nutrition',
            'stress',
            'environment'
        ];

        for (const factor of data.factors) {
            if (!validFactors.includes(factor)) {
                return `Invalid factor: ${factor}`;
            }
        }
    }

    if (data.notes !== undefined && typeof data.notes !== 'string') {
        return 'Notes must be a string';
    }

    return null;
}

export function validateEnergyInfluencer(data: any): string | null {
    if (!data) {
        return 'Energy influencer data is required';
    }

    const validFactorTypes = [
        'sleep',
        'medication',
        'exercise',
        'nutrition',
        'stress',
        'environment',
        'social',
        'other'
    ];

    if (!validFactorTypes.includes(data.factor_type)) {
        return 'Invalid factor type';
    }

    if (typeof data.impact_level !== 'number' || data.impact_level < -5 || data.impact_level > 5) {
        return 'Impact level must be a number between -5 and 5';
    }

    if (!data.description || typeof data.description !== 'string') {
        return 'Description is required and must be a string';
    }

    const validFrequencies = ['always', 'often', 'sometimes', 'rarely', 'variable'];
    if (data.frequency && !validFrequencies.includes(data.frequency)) {
        return 'Invalid frequency value';
    }

    return null;
}
