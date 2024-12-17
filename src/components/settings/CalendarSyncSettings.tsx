import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import {
    Schedule,
    Settings,
    CalendarToday,
    NotificationsActive,
} from '@mui/icons-material';

interface SyncSettings {
    autoSync: boolean;
    syncFrequency: number;
    reminderMinutes: number;
    colorCode: boolean;
    includeEnergyInfo: boolean;
}

const CalendarSyncSettings: React.FC = () => {
    const [settings, setSettings] = useState<SyncSettings>({
        autoSync: true,
        syncFrequency: 30,
        reminderMinutes: 15,
        colorCode: true,
        includeEnergyInfo: true,
    });
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {
        loadSettings();
        checkConnection();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/settings/calendar');
            if (!response.ok) throw new Error('Failed to load settings');
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            setError('Error loading settings');
            console.error('Error loading calendar settings:', error);
        }
    };

    const checkConnection = async () => {
        try {
            const response = await fetch('/api/calendar/status');
            if (!response.ok) throw new Error('Failed to check connection');
            const { connected } = await response.json();
            setIsConnected(connected);
        } catch (error) {
            console.error('Error checking calendar connection:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const response = await fetch('/api/calendar/auth-url');
            if (!response.ok) throw new Error('Failed to get auth URL');
            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            setError('Error connecting to calendar');
            console.error('Error getting auth URL:', error);
        }
    };

    const handleSettingChange = async (setting: keyof SyncSettings, value: any) => {
        try {
            const newSettings = { ...settings, [setting]: value };
            setSettings(newSettings);

            const response = await fetch('/api/settings/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });

            if (!response.ok) throw new Error('Failed to update settings');
        } catch (error) {
            setError('Error updating settings');
            console.error('Error updating calendar settings:', error);
        }
    };

    const handleSyncNow = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/calendar/sync', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to sync calendar');
            setError(null);
        } catch (error) {
            setError('Error syncing calendar');
            console.error('Error syncing calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday />
                        Calendar Integration
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {!isConnected ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="body1" gutterBottom>
                                Connect your calendar to sync your energy-optimized schedule
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleConnect}
                                startIcon={<CalendarToday />}
                            >
                                Connect Calendar
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <List>
                                <ListItem>
                                    <ListItemText 
                                        primary="Automatic Sync"
                                        secondary="Automatically sync schedule changes to calendar"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            edge="end"
                                            checked={settings.autoSync}
                                            onChange={(e) => handleSettingChange('autoSync', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText 
                                        primary="Color Code Events"
                                        secondary="Use colors to indicate cognitive load and energy requirements"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            edge="end"
                                            checked={settings.colorCode}
                                            onChange={(e) => handleSettingChange('colorCode', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText 
                                        primary="Include Energy Information"
                                        secondary="Add energy level and cognitive load to event descriptions"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            edge="end"
                                            checked={settings.includeEnergyInfo}
                                            onChange={(e) => handleSettingChange('includeEnergyInfo', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText 
                                        primary="Reminder Settings"
                                        secondary={`Remind me ${settings.reminderMinutes} minutes before tasks`}
                                    />
                                    <ListItemSecondaryAction>
                                        <Button
                                            size="small"
                                            onClick={() => setOpenDialog(true)}
                                            startIcon={<NotificationsActive />}
                                        >
                                            Configure
                                        </Button>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>

                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleSyncNow}
                                    startIcon={<Schedule />}
                                    disabled={loading}
                                >
                                    Sync Now
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => setOpenDialog(true)}
                                    startIcon={<Settings />}
                                >
                                    Advanced Settings
                                </Button>
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Calendar Sync Settings</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        type="number"
                        label="Sync Frequency (minutes)"
                        value={settings.syncFrequency}
                        onChange={(e) => handleSettingChange('syncFrequency', parseInt(e.target.value))}
                        sx={{ mb: 2, mt: 1 }}
                    />
                    <TextField
                        fullWidth
                        type="number"
                        label="Reminder Time (minutes before)"
                        value={settings.reminderMinutes}
                        onChange={(e) => handleSettingChange('reminderMinutes', parseInt(e.target.value))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                Tip: Color coding helps identify task intensity at a glance. 
                Red indicates high cognitive load, while green indicates low-energy tasks.
            </Typography>
        </Box>
    );
};

export default CalendarSyncSettings;
