import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Tooltip,
} from '@mui/material';
import {
    WbSunny,
    NightsStay,
    Battery20,
    Battery50,
    Battery80,
    BatteryFull,
    Psychology,
    Timer,
} from '@mui/icons-material';

interface Task {
    id: string;
    title: string;
    estimatedEnergy: number;
    cognitiveLoad: number;
    contextCategory: string;
    deadline?: Date;
}

interface HourlySchedule {
    hour: number;
    tasks: Task[];
}

interface EnergyInsight {
    insights: string[];
}

const EnergyAwareSchedule: React.FC = () => {
    const [schedule, setSchedule] = useState<HourlySchedule[]>([]);
    const [insights, setInsights] = useState<string[]>([]);
    const [breaks, setBreaks] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchScheduleData();
    }, []);

    const fetchScheduleData = async () => {
        try {
            setLoading(true);
            
            // Fetch schedule
            const scheduleResponse = await fetch('/api/task-distribution/schedule');
            if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
            const scheduleData = await scheduleResponse.json();
            setSchedule(scheduleData);

            // Fetch insights
            const insightsResponse = await fetch('/api/task-distribution/insights');
            if (!insightsResponse.ok) throw new Error('Failed to fetch insights');
            const insightsData: EnergyInsight = await insightsResponse.json();
            setInsights(insightsData.insights);

            // Fetch break suggestions
            const breaksResponse = await fetch('/api/task-distribution/breaks');
            if (!breaksResponse.ok) throw new Error('Failed to fetch breaks');
            const breaksData = await breaksResponse.json();
            setBreaks(breaksData.breakHours);

            setError(null);
        } catch (error) {
            setError('Error loading schedule. Please try again.');
            console.error('Error fetching schedule data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEnergyIcon = (tasks: Task[]) => {
        const avgEnergy = tasks.reduce((sum, t) => sum + t.estimatedEnergy, 0) / tasks.length;
        if (avgEnergy < 3) return <Battery20 />;
        if (avgEnergy < 5) return <Battery50 />;
        if (avgEnergy < 7) return <Battery80 />;
        return <BatteryFull />;
    };

    const getTimeIcon = (hour: number) => {
        if (hour >= 6 && hour < 18) return <WbSunny />;
        return <NightsStay />;
    };

    const formatHour = (hour: number) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const adjustedHour = hour % 12 || 12;
        return `${adjustedHour}:00 ${ampm}`;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
                {/* Insights Section */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Energy Insights
                            </Typography>
                            <List>
                                {insights.map((insight, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <Psychology />
                                        </ListItemIcon>
                                        <ListItemText primary={insight} />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Schedule Section */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Energy-Optimized Schedule
                            </Typography>
                            <List>
                                {schedule.map(({ hour, tasks }) => (
                                    <ListItem
                                        key={hour}
                                        sx={{
                                            bgcolor: breaks.includes(hour) ? 'action.hover' : 'inherit',
                                            borderRadius: 1,
                                            mb: 1,
                                        }}
                                    >
                                        <ListItemIcon>
                                            {getTimeIcon(hour)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="subtitle1">
                                                        {formatHour(hour)}
                                                    </Typography>
                                                    {breaks.includes(hour) && (
                                                        <Chip
                                                            size="small"
                                                            label="Suggested Break"
                                                            color="secondary"
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ mt: 1 }}>
                                                    {tasks.map(task => (
                                                        <Tooltip
                                                            key={task.id}
                                                            title={`Energy: ${task.estimatedEnergy}, Cognitive Load: ${task.cognitiveLoad}`}
                                                        >
                                                            <Chip
                                                                icon={<Timer />}
                                                                label={task.title}
                                                                size="small"
                                                                sx={{ mr: 1, mb: 1 }}
                                                                color={task.cognitiveLoad > 7 ? 'warning' : 'default'}
                                                            />
                                                        </Tooltip>
                                                    ))}
                                                </Box>
                                            }
                                        />
                                        <ListItemIcon>
                                            {getEnergyIcon(tasks)}
                                        </ListItemIcon>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* ADHD-Friendly Tips */}
                <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary" align="center">
                        Tip: This schedule is optimized based on your energy patterns. 
                        High-cognitive tasks are scheduled during your peak energy hours, 
                        and breaks are suggested during low-energy periods.
                    </Typography>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EnergyAwareSchedule;
