import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CONFIG } from '../config/google';

interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    colorId?: string;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: string;
            minutes: number;
        }>;
    };
}

export class CalendarIntegrationService {
    private oauth2Client: OAuth2Client;
    private calendar: any;

    constructor(private db: D1Database) {
        // Initialize OAuth2 client with your credentials
        this.oauth2Client = new google.auth.OAuth2(
            GOOGLE_CONFIG.CLIENT_ID,
            GOOGLE_CONFIG.CLIENT_SECRET,
            GOOGLE_CONFIG.REDIRECT_URI
        );

        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    async getAuthUrl(): Promise<string> {
        const scopes = GOOGLE_CONFIG.SCOPES;

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    async handleCallback(code: string, userId: string): Promise<void> {
        const { tokens } = await this.oauth2Client.getToken(code);
        
        // Store tokens in database
        await this.db.prepare(`
            INSERT OR REPLACE INTO user_calendar_tokens (
                user_id,
                access_token,
                refresh_token,
                expiry_date
            ) VALUES (?, ?, ?, ?)
        `).bind(
            userId,
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date
        ).run();
    }

    private async loadUserTokens(userId: string): Promise<void> {
        const tokens = await this.db.prepare(`
            SELECT access_token, refresh_token, expiry_date
            FROM user_calendar_tokens
            WHERE user_id = ?
        `).bind(userId).first();

        if (!tokens) {
            throw new Error('User not authenticated with Google Calendar');
        }

        this.oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
        });
    }

    async createTaskEvent(
        userId: string,
        task: {
            id: string;
            title: string;
            description?: string;
            startTime: string;
            endTime: string;
            cognitiveLoad: number;
        }
    ): Promise<string> {
        await this.loadUserTokens(userId);

        // Choose color based on cognitive load (1-10)
        const colorId = this.getCognitiveLoadColor(task.cognitiveLoad);

        const event: CalendarEvent = {
            summary: task.title,
            description: this.formatEventDescription(task),
            start: {
                dateTime: task.startTime,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: task.endTime,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            colorId,
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'email', minutes: 60 }
                ]
            }
        };

        const response = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
        });

        // Store the calendar event ID with the task
        await this.db.prepare(`
            UPDATE tasks
            SET calendar_event_id = ?
            WHERE id = ? AND user_id = ?
        `).bind(response.data.id, task.id, userId).run();

        return response.data.id;
    }

    async updateTaskEvent(
        userId: string,
        taskId: string,
        updates: Partial<{
            title: string;
            description: string;
            startTime: string;
            endTime: string;
            cognitiveLoad: number;
        }>
    ): Promise<void> {
        await this.loadUserTokens(userId);

        // Get the calendar event ID
        const task = await this.db.prepare(`
            SELECT calendar_event_id
            FROM tasks
            WHERE id = ? AND user_id = ?
        `).bind(taskId, userId).first();

        if (!task?.calendar_event_id) {
            throw new Error('No calendar event found for this task');
        }

        const event: Partial<CalendarEvent> = {};
        if (updates.title) event.summary = updates.title;
        if (updates.description) event.description = updates.description;
        if (updates.startTime) {
            event.start = {
                dateTime: updates.startTime,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
        }
        if (updates.endTime) {
            event.end = {
                dateTime: updates.endTime,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
        }
        if (updates.cognitiveLoad) {
            event.colorId = this.getCognitiveLoadColor(updates.cognitiveLoad);
        }

        await this.calendar.events.patch({
            calendarId: 'primary',
            eventId: task.calendar_event_id,
            requestBody: event
        });
    }

    async deleteTaskEvent(userId: string, taskId: string): Promise<void> {
        await this.loadUserTokens(userId);

        const task = await this.db.prepare(`
            SELECT calendar_event_id
            FROM tasks
            WHERE id = ? AND user_id = ?
        `).bind(taskId, userId).first();

        if (task?.calendar_event_id) {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: task.calendar_event_id
            });

            await this.db.prepare(`
                UPDATE tasks
                SET calendar_event_id = NULL
                WHERE id = ? AND user_id = ?
            `).bind(taskId, userId).run();
        }
    }

    async getUpcomingEvents(userId: string, days: number = 7): Promise<any[]> {
        await this.loadUserTokens(userId);

        const response = await this.calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            timeMax: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        return response.data.items;
    }

    private getCognitiveLoadColor(load: number): string {
        // Google Calendar color IDs (1-11)
        // Map cognitive load (1-10) to appropriate colors
        // Lower loads: cooler colors (blues, greens)
        // Higher loads: warmer colors (yellows, reds)
        const colorMap: { [key: number]: string } = {
            1: '1',  // Light blue
            2: '2',  // Green
            3: '3',  // Purple
            4: '4',  // Pink
            5: '5',  // Yellow
            6: '6',  // Orange
            7: '7',  // Cyan
            8: '8',  // Gray
            9: '9',  // Blue
            10: '11' // Red
        };
        return colorMap[Math.min(Math.max(Math.round(load), 1), 10)];
    }

    private formatEventDescription(task: { description?: string; cognitiveLoad: number }): string {
        return `${task.description || ''}
        
Cognitive Load: ${task.cognitiveLoad}/10
Created by Done365 Task Manager`;
    }
}
