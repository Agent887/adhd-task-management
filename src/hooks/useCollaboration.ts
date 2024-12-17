import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface CollaborationPartner {
    id: string;
    name: string;
    email: string;
    role: 'accountability' | 'support' | 'collaborator';
    permissions: string[];
}

export interface SharedTask {
    id: string;
    title: string;
    description: string;
    status: string;
    assignedTo: string[];
    progress: number;
    lastUpdate: Date;
    comments: Array<{
        id: string;
        userId: string;
        userName: string;
        message: string;
        timestamp: Date;
        type?: 'comment' | 'celebration';
    }>;
}

export function useCollaboration() {
    const { user } = useAuth();
    const [partners, setPartners] = useState<CollaborationPartner[]>([]);
    const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadCollaborationData();
        }
    }, [user]);

    const loadCollaborationData = async () => {
        try {
            // Here you would fetch real data from your API
            setPartners([
                {
                    id: '2',
                    name: 'Partner 1',
                    email: 'partner1@example.com',
                    role: 'collaborator',
                    permissions: ['view', 'comment']
                },
                {
                    id: '3',
                    name: 'Partner 2',
                    email: 'partner2@example.com',
                    role: 'accountability',
                    permissions: ['view', 'comment', 'edit']
                },
                {
                    id: '4',
                    name: 'Partner 3',
                    email: 'partner3@example.com',
                    role: 'support',
                    permissions: ['view', 'comment', 'celebrate']
                }
            ]);
            setSharedTasks([
                {
                    id: '1',
                    title: 'Shared Task 1',
                    description: 'Description 1',
                    status: 'in_progress',
                    assignedTo: ['1', '2'],
                    progress: 0,
                    lastUpdate: new Date(),
                    comments: []
                }
            ]);
            setLoading(false);
        } catch (error) {
            console.error('Error loading collaboration data:', error);
            setLoading(false);
        }
    };

    const addPartner = async (email: string, role: string) => {
        // Implement add partner logic
        const newPartner: CollaborationPartner = {
            id: Date.now().toString(),
            name: email.split('@')[0],
            email,
            role,
            permissions: ['view', 'comment']
        };
        setPartners(prev => [...prev, newPartner]);
    };

    const shareTask = async (taskId: string, partnerIds: string[]) => {
        // Implement share task logic
    };

    const updateTaskProgress = async (taskId: string, progress: number) => {
        setSharedTasks(prev =>
            prev.map(task =>
                task.id === taskId
                    ? { ...task, progress, lastUpdate: new Date() }
                    : task
            )
        );
    };

    const addTaskComment = async (taskId: string, message: string, type: 'comment' | 'celebration' = 'comment') => {
        if (!user) return;

        const comment = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            message,
            timestamp: new Date(),
            type
        };

        setSharedTasks(prev =>
            prev.map(task =>
                task.id === taskId
                    ? { ...task, comments: [...task.comments, comment] }
                    : task
            )
        );
    };

    return {
        partners,
        sharedTasks,
        loading,
        addPartner,
        shareTask,
        updateTaskProgress,
        addTaskComment
    };
}
