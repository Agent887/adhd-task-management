import { useSession } from 'next-auth/react';
import { useState, useCallback } from 'react';

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
  colorId?: string;  // For energy level indication
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  extendedProperties?: {
    private: {
      energyLevel?: string;
      taskComplexity?: string;
      adhd_context?: string;
      estimated_focus_required?: string;
    };
  };
}

interface TimeSlot {
  start: Date;
  end: Date;
  energyLevel: number;
}

export function useGoogleCalendar() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(async (event: CalendarEvent) => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error('Failed to create calendar event');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update calendar event');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const findOptimalTimeSlot = useCallback(async (
    taskDuration: number,
    requiredEnergyLevel: number,
    preferredTimeRange?: { start: Date; end: Date }
  ): Promise<TimeSlot | null> => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Default to looking for slots in the next 7 days if no preferred range
      const defaultStart = new Date();
      const defaultEnd = new Date();
      defaultEnd.setDate(defaultEnd.getDate() + 7);

      const timeMin = preferredTimeRange?.start || defaultStart;
      const timeMax = preferredTimeRange?.end || defaultEnd;

      // Get existing events
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const { items: events } = await response.json();

      // Get user's working hours (9 AM to 5 PM by default)
      const workingHours = {
        start: 9,
        end: 17,
      };

      // Find available slots
      const availableSlots: TimeSlot[] = [];
      let currentDate = new Date(timeMin);

      while (currentDate <= timeMax) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
          const dayStart = new Date(currentDate);
          dayStart.setHours(workingHours.start, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(workingHours.end, 0, 0, 0);

          // Calculate energy level based on time of day
          // Assuming peak energy in morning, dip after lunch
          const getEnergyLevel = (hour: number): number => {
            if (hour >= 9 && hour < 11) return 5; // Morning peak
            if (hour >= 11 && hour < 13) return 4; // Late morning
            if (hour >= 13 && hour < 15) return 2; // Post-lunch dip
            if (hour >= 15 && hour < 17) return 3; // Afternoon recovery
            return 1; // Low energy outside working hours
          };

          // Find free slots in this day
          let slotStart = dayStart;
          for (let hour = workingHours.start; hour < workingHours.end; hour++) {
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotStart.getMinutes() + taskDuration);

            const conflictingEvent = events.find((event: CalendarEvent) => {
              const eventStart = new Date(event.start.dateTime);
              const eventEnd = new Date(event.end.dateTime);
              return (
                (slotStart >= eventStart && slotStart < eventEnd) ||
                (slotEnd > eventStart && slotEnd <= eventEnd)
              );
            });

            if (!conflictingEvent && getEnergyLevel(hour) >= requiredEnergyLevel) {
              availableSlots.push({
                start: new Date(slotStart),
                end: new Date(slotEnd),
                energyLevel: getEnergyLevel(hour),
              });
            }

            slotStart = new Date(slotStart);
            slotStart.setHours(hour + 1, 0, 0, 0);
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort slots by energy level and return the best match
      return availableSlots.sort((a, b) => b.energyLevel - a.energyLevel)[0] || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const listEvents = useCallback(async (timeMin: string, timeMax: string) => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&key=${process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const listPublicEvents = useCallback(async (calendarId: string, timeMin: string, timeMax: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&key=${process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch public calendar events');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createEvent,
    updateEvent,
    listEvents,
    listPublicEvents,
    findOptimalTimeSlot,
    loading,
    error,
  };
}
