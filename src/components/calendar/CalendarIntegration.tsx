import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Stack
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

export const CalendarIntegration: React.FC = () => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkConnectionStatus();
    }, [user]);

    const checkConnectionStatus = async () => {
        try {
            const response = await fetch('/api/calendar/events/upcoming?days=1');
            setIsConnected(response.ok);
        } catch (err) {
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/calendar/auth/url');
            const { url } = await response.json();
            window.location.href = url;
        } catch (err) {
            setError('Failed to initiate Google Calendar connection');
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        // Implementation for disconnecting calendar integration
        // This would involve removing tokens and updating UI
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent>
                    <Stack alignItems="center" spacing={2}>
                        <CircularProgress />
                        <Typography>Checking calendar connection...</Typography>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <CalendarIcon color="primary" />
                        <Typography variant="h6">
                            Google Calendar Integration
                        </Typography>
                    </Stack>

                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Typography color="text.secondary">
                        {isConnected
                            ? 'Your Google Calendar is connected. Tasks will be automatically synchronized.'
                            : 'Connect your Google Calendar to automatically create events for your tasks.'}
                    </Typography>

                    <Button
                        variant={isConnected ? 'outlined' : 'contained'}
                        color={isConnected ? 'error' : 'primary'}
                        onClick={isConnected ? handleDisconnect : handleConnect}
                        disabled={isLoading}
                    >
                        {isConnected ? 'Disconnect Calendar' : 'Connect Calendar'}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};
