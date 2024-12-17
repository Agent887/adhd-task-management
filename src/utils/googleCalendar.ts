import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Task } from '../types/task';
import { useUserMetrics } from '../hooks/useUserMetrics';

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
    overrides?: {
      method: string;
      minutes: number;
    }[];
  };
}

export class GoogleCalendarAPI {
  private static instance: GoogleCalendarAPI;
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private readonly SCOPES = ['https://www.googleapis.com/auth/calendar'];

  private constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  public static getInstance(): GoogleCalendarAPI {
    if (!GoogleCalendarAPI.instance) {
      GoogleCalendarAPI.instance = new GoogleCalendarAPI();
    }
    return GoogleCalendarAPI.instance;
  }

  private getColorId(task: Task): string {
    // Google Calendar color IDs:
    // 1: Lavender, 2: Sage, 3: Grape, 4: Flamingo, 5: Banana
    // 6: Tangerine, 7: Peacock, 8: Graphite, 9: Blueberry, 10: Basil, 11: Tomato
    if (task.priority > 70) return '11'; // High priority - Red
    if (task.energyRequired > 70) return '6'; // High energy - Orange
    if (task.complexity > 70) return '3'; // High complexity - Purple
    return '7'; // Default - Blue
  }

  private getReminders(task: Task) {
    const reminders = {
      useDefault: false,
      overrides: [] as { method: string; minutes: number }[],
    };

    // Add reminders based on task properties
    if (task.priority > 70) {
      reminders.overrides.push(
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 }
      );
    } else if (task.complexity > 70) {
      reminders.overrides.push(
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 120 }
      );
    } else {
      reminders.overrides.push({ method: 'popup', minutes: 15 });
    }

    return reminders;
  }

  public async createEvent(task: Task, userMetrics: ReturnType<typeof useUserMetrics>): Promise<string> {
    const startTime = new Date(task.scheduledTime || Date.now());
    const endTime = new Date(startTime.getTime() + (task.estimatedDuration || 30) * 60000);

    const event: CalendarEvent = {
      summary: task.title,
      description: `${task.description}\n\nPriority: ${task.priority}\nEnergy Required: ${task.energyRequired}\nComplexity: ${task.complexity}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: this.getColorId(task),
      reminders: this.getReminders(task),
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  public async updateEvent(eventId: string, task: Task): Promise<void> {
    const startTime = new Date(task.scheduledTime || Date.now());
    const endTime = new Date(startTime.getTime() + (task.estimatedDuration || 30) * 60000);

    const event: CalendarEvent = {
      summary: task.title,
      description: `${task.description}\n\nPriority: ${task.priority}\nEnergy Required: ${task.energyRequired}\nComplexity: ${task.complexity}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: this.getColorId(task),
      reminders: this.getReminders(task),
    };

    try {
      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  public async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  public async getFreeSlots(
    startDate: Date,
    endDate: Date,
    minDuration: number = 30
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars.primary.busy;
      const freeSlots: { start: Date; end: Date }[] = [];
      let currentTime = new Date(startDate);

      busySlots.forEach((busy: { start: string; end: string }) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);

        if (currentTime < busyStart) {
          const duration = (busyStart.getTime() - currentTime.getTime()) / 60000;
          if (duration >= minDuration) {
            freeSlots.push({
              start: new Date(currentTime),
              end: new Date(busyStart),
            });
          }
        }
        currentTime = new Date(busyEnd);
      });

      if (currentTime < endDate) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(endDate),
        });
      }

      return freeSlots;
    } catch (error) {
      console.error('Error getting free slots:', error);
      throw error;
    }
  }

  public async findOptimalSlot(
    task: Task,
    userMetrics: ReturnType<typeof useUserMetrics>
  ): Promise<Date | null> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    try {
      const freeSlots = await this.getFreeSlots(
        now,
        weekFromNow,
        task.estimatedDuration || 30
      );

      // Filter slots based on user's typical energy patterns
      const optimalSlots = freeSlots.filter(slot => {
        const hour = slot.start.getHours();
        
        // High energy tasks in the morning if user typically has high energy then
        if (task.energyRequired > 70) {
          return hour >= 9 && hour <= 12;
        }
        
        // Complex tasks when focus is typically highest
        if (task.complexity > 70) {
          return hour >= 14 && hour <= 17;
        }
        
        return true;
      });

      if (optimalSlots.length === 0) return null;
      
      // Return the earliest optimal slot
      return optimalSlots[0].start;
    } catch (error) {
      console.error('Error finding optimal slot:', error);
      return null;
    }
  }

  public setCredentials(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
  }

  public getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
    });
  }

  public async getTokens(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }
}
