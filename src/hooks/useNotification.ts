import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: Date;
    priority: 'high' | 'medium' | 'low';
    read: boolean;
}

export function useNotification() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            // Load notifications
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        try {
            // Here you would fetch real notifications from your API
            // For now, we'll use mock data
            setNotifications([
                {
                    id: '1',
                    title: 'Task Reminder',
                    message: 'You have a task due in 1 hour',
                    type: 'warning',
                    timestamp: new Date(),
                    priority: 'high',
                    read: false
                }
            ]);
            setLoading(false);
        } catch (error) {
            console.error('Error loading notifications:', error);
            setLoading(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        const newNotification: Notification = {
            id: Date.now().toString(),
            title: type.charAt(0).toUpperCase() + type.slice(1),
            message,
            type,
            timestamp: new Date(),
            priority: type === 'error' ? 'high' : 'medium',
            read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    const markAsRead = async (notificationId: string) => {
        // Implement mark as read logic
        setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
        );
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return {
        notifications,
        loading,
        showNotification,
        markAsRead,
        clearAll
    };
}
