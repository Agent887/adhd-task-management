export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: Date;
    priority: 'high' | 'medium' | 'low';
    read: boolean;
}
