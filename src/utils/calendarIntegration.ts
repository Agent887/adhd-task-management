import { Task } from '../types/task';
import { useUserMetrics } from '../hooks/useUserMetrics';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  color?: string;
}

interface CalendarConfig {
  provider: 'google' | 'outlook' | 'apple';
  syncEnabled: boolean;
  defaultDuration: number; // minutes
  colorCoding: boolean;
}

export const useCalendarIntegration = () => {
  const { metrics } = useUserMetrics();

  const getEventColor = (task: Task): string => {
    if (task.priority > 70) return '#ff4444';
    if (task.energyRequired > 70) return '#ff8800';
    if (task.complexity > 70) return '#aa00ff';
    return '#2196f3';
  };

  const taskToEvent = (task: Task): CalendarEvent => {
    const start = new Date(task.scheduledTime || Date.now());
    const end = new Date(start.getTime() + (task.estimatedDuration || 30) * 60000);

    return {
      id: task.id,
      title: task.title,
      start,
      end,
      description: task.description,
      color: getEventColor(task),
    };
  };

  const optimizeSchedule = (tasks: Task[]): CalendarEvent[] => {
    // Sort tasks by priority and energy requirements
    const sortedTasks = [...tasks].sort((a, b) => {
      const aScore = (a.priority * 0.4) + (a.energyRequired * 0.3) + (a.urgency * 0.3);
      const bScore = (b.priority * 0.4) + (b.energyRequired * 0.3) + (b.urgency * 0.3);
      return bScore - aScore;
    });

    // Schedule tasks based on user's energy patterns
    let currentTime = new Date();
    return sortedTasks.map(task => {
      // Adjust timing based on energy levels
      if (task.energyRequired > 70 && metrics.energyLevel < 50) {
        // Move high-energy tasks to when energy typically peaks
        currentTime.setHours(10, 0, 0, 0); // Assuming 10 AM is peak energy time
      }

      const event = taskToEvent({
        ...task,
        scheduledTime: currentTime.toISOString(),
      });

      // Update currentTime for next task
      currentTime = new Date(event.end.getTime() + 15 * 60000); // 15-minute break
      return event;
    });
  };

  const syncWithCalendar = async (
    events: CalendarEvent[],
    config: CalendarConfig
  ): Promise<void> => {
    // Implementation would depend on the calendar provider's API
    switch (config.provider) {
      case 'google':
        // Implement Google Calendar sync
        break;
      case 'outlook':
        // Implement Outlook sync
        break;
      case 'apple':
        // Implement Apple Calendar sync
        break;
    }
  };

  const getConflicts = (events: CalendarEvent[]): CalendarEvent[][] => {
    const conflicts: CalendarEvent[][] = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (events[i].start < events[j].end && events[j].start < events[i].end) {
          conflicts.push([events[i], events[j]]);
        }
      }
    }

    return conflicts;
  };

  return {
    taskToEvent,
    optimizeSchedule,
    syncWithCalendar,
    getConflicts,
  };
};
