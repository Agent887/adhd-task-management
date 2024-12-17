import { GOOGLE_CLOUD_CONFIG } from '../config/google_cloud';

export class GeminiService {
    private apiUrl = 'http://localhost:8000/api';

    async processVoiceInput(audioBlob: Blob, transcript?: string) {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        if (transcript) {
            formData.append('transcript', transcript);
        }

        const response = await fetch(`${this.apiUrl}/voice/process`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }

    async generateTaskVisual(taskDescription: string) {
        const response = await fetch(`${this.apiUrl}/task/visualize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ task_description: taskDescription })
        });
        return await response.json();
    }

    async analyzeTask(taskDescription: string) {
        const response = await fetch(`${this.apiUrl}/task/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ task_description: taskDescription })
        });
        return await response.json();
    }

    async createReminders(task: string, userContext: string) {
        const response = await fetch(`${this.apiUrl}/reminders/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ task, context: userContext })
        });
        return await response.json();
    }
}
