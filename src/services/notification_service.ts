import { WebSocket } from 'ws';

export interface Notification {
    id: string;
    type: 'progress' | 'celebration' | 'reminder' | 'support' | 'energy' | 'break';
    title: string;
    message: string;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
    metadata?: {
        taskId?: string;
        partnerId?: string;
        energyLevel?: number;
        progress?: number;
    };
}

export class NotificationService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private subscribers: ((notification: Notification) => void)[] = [];

    constructor(private userId: string, private serverUrl: string) {}

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.ws = new WebSocket(`${this.serverUrl}?userId=${this.userId}`);

        this.ws.onopen = () => {
            console.log('Connected to notification service');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const notification: Notification = JSON.parse(event.data);
                this.handleNotification(notification);
            } catch (error) {
                console.error('Error parsing notification:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from notification service');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }

    subscribe(callback: (notification: Notification) => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private handleNotification(notification: Notification) {
        // Add ADHD-friendly features
        this.enhanceNotification(notification);
        
        // Notify all subscribers
        this.subscribers.forEach(callback => callback(notification));
    }

    private enhanceNotification(notification: Notification) {
        // Add emoji based on notification type
        const emoji = this.getNotificationEmoji(notification.type);
        notification.title = `${emoji} ${notification.title}`;

        // Add color coding based on priority
        notification.metadata = {
            ...notification.metadata,
            color: this.getPriorityColor(notification.priority)
        };

        // Add haptic feedback recommendation
        notification.metadata = {
            ...notification.metadata,
            haptic: this.getHapticPattern(notification.type, notification.priority)
        };
    }

    private getNotificationEmoji(type: Notification['type']): string {
        switch (type) {
            case 'progress':
                return '📈';
            case 'celebration':
                return '🎉';
            case 'reminder':
                return '⏰';
            case 'support':
                return '🤝';
            case 'energy':
                return '⚡';
            case 'break':
                return '☕';
            default:
                return '📢';
        }
    }

    private getPriorityColor(priority: Notification['priority']): string {
        switch (priority) {
            case 'high':
                return '#ff4444';
            case 'medium':
                return '#ffbb33';
            case 'low':
                return '#00C851';
            default:
                return '#33b5e5';
        }
    }

    private getHapticPattern(type: Notification['type'], priority: Notification['priority']): number[] {
        // Define haptic patterns for different notification types and priorities
        // Numbers represent vibration duration in milliseconds
        switch (type) {
            case 'celebration':
                return [100, 50, 100, 50, 100]; // Triple pulse
            case 'reminder':
                return priority === 'high' ? [200, 100, 200] : [100, 50, 100]; // Double pulse
            case 'break':
                return [300]; // Single long pulse
            default:
                return [100]; // Single short pulse
        }
    }

    // Send notifications
    async sendProgressUpdate(taskId: string, progress: number) {
        const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'progress',
            title: 'Task Progress Update',
            message: `Task progress updated to ${progress}%`,
            timestamp: new Date(),
            priority: this.getProgressPriority(progress),
            metadata: {
                taskId,
                progress
            }
        };

        await this.sendNotification(notification);
    }

    async sendCelebration(taskId: string, message: string) {
        const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'celebration',
            title: 'Celebration Time!',
            message,
            timestamp: new Date(),
            priority: 'medium',
            metadata: {
                taskId
            }
        };

        await this.sendNotification(notification);
    }

    async sendEnergyAlert(energyLevel: number) {
        const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'energy',
            title: 'Energy Level Update',
            message: this.getEnergyMessage(energyLevel),
            timestamp: new Date(),
            priority: this.getEnergyPriority(energyLevel),
            metadata: {
                energyLevel
            }
        };

        await this.sendNotification(notification);
    }

    async sendBreakReminder(reason: string) {
        const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'break',
            title: 'Time for a Break',
            message: reason,
            timestamp: new Date(),
            priority: 'medium',
        };

        await this.sendNotification(notification);
    }

    private getProgressPriority(progress: number): Notification['priority'] {
        if (progress >= 75) return 'high';
        if (progress >= 50) return 'medium';
        return 'low';
    }

    private getEnergyMessage(level: number): string {
        if (level <= 20) return 'Energy is very low. Consider taking a break!';
        if (level <= 40) return 'Energy is getting low. Plan for a break soon.';
        if (level >= 80) return 'Energy is high! Great time for challenging tasks!';
        return 'Energy levels are moderate. Keep up the good work!';
    }

    private getEnergyPriority(level: number): Notification['priority'] {
        if (level <= 20) return 'high';
        if (level <= 40) return 'medium';
        return 'low';
    }

    private async sendNotification(notification: Notification) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(notification));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
