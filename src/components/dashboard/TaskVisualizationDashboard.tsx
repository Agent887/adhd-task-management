import React, { useEffect, useState } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { useTheme } from '@mui/material/styles';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Timeline,
    BubbleChart,
    AccountTree,
    SwapHoriz,
    Battery20,
    Battery50,
    Battery80,
    BatteryFull,
} from '@mui/icons-material';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveCalendar } from '@nivo/calendar';

interface Task {
    id: string;
    title: string;
    contextCategory: string;
    cognitiveLoad: number;
    dependencies: string[];
    status: string;
    energyLevel?: number;
    completedAt?: string;
}

interface GraphData {
    nodes: Array<{
        id: string;
        name: string;
        val: number;
        color: string;
        group: string;
    }>;
    links: Array<{
        source: string;
        target: string;
        value: number;
    }>;
}

interface EnergyDistribution {
    hour: number;
    energy: number;
    tasks: number;
}

const TaskVisualizationDashboard: React.FC = () => {
    const theme = useTheme();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [selectedView, setSelectedView] = useState<'dependencies' | 'contexts' | 'timeline' | 'energy'>('dependencies');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [energyData, setEnergyData] = useState<EnergyDistribution[]>([]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/visualization/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            const data = await response.json();
            setTasks(data);
            generateGraphData(data);
            generateEnergyData(data);
            setError(null);
        } catch (error) {
            setError('Error loading visualization data. Please try again.');
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateGraphData = (taskData: Task[]) => {
        const nodes = taskData.map(task => ({
            id: task.id,
            name: task.title,
            val: task.cognitiveLoad,
            color: getColorForContext(task.contextCategory),
            group: task.contextCategory
        }));

        const links = taskData.flatMap(task => 
            task.dependencies.map(depId => ({
                source: depId,
                target: task.id,
                value: 1
            }))
        );

        setGraphData({ nodes, links });
    };

    const generateEnergyData = (taskData: Task[]) => {
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            energy: 0,
            tasks: 0
        }));

        taskData.forEach(task => {
            if (task.completedAt) {
                const hour = new Date(task.completedAt).getHours();
                hourlyData[hour].tasks += 1;
                hourlyData[hour].energy += task.energyLevel || 0;
            }
        });

        setEnergyData(hourlyData);
    };

    const getColorForContext = (context: string): string => {
        const colors = {
            work: theme.palette.primary.main,
            personal: theme.palette.secondary.main,
            health: theme.palette.success.main,
            learning: theme.palette.info.main,
            default: theme.palette.grey[500]
        };
        return colors[context as keyof typeof colors] || colors.default;
    };

    const getEnergyIcon = (level: number) => {
        if (level < 25) return <Battery20 />;
        if (level < 50) return <Battery50 />;
        if (level < 75) return <Battery80 />;
        return <BatteryFull />;
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ mb: 2 }}>
            {error}
        </Alert>
    );

    return (
        <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                        <Tooltip title="Dependencies View">
                            <IconButton 
                                onClick={() => setSelectedView('dependencies')}
                                color={selectedView === 'dependencies' ? 'primary' : 'default'}
                            >
                                <AccountTree />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Context View">
                            <IconButton 
                                onClick={() => setSelectedView('contexts')}
                                color={selectedView === 'contexts' ? 'primary' : 'default'}
                            >
                                <BubbleChart />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Timeline View">
                            <IconButton 
                                onClick={() => setSelectedView('timeline')}
                                color={selectedView === 'timeline' ? 'primary' : 'default'}
                            >
                                <Timeline />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Energy Distribution">
                            <IconButton 
                                onClick={() => setSelectedView('energy')}
                                color={selectedView === 'energy' ? 'primary' : 'default'}
                            >
                                <BatteryFull />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            {selectedView === 'dependencies' && (
                                <Box sx={{ height: 600 }}>
                                    <ForceGraph2D
                                        graphData={graphData}
                                        nodeLabel="name"
                                        nodeRelSize={6}
                                        nodeAutoColorBy="group"
                                        linkDirectionalParticles={2}
                                        linkDirectionalParticleSpeed={0.005}
                                    />
                                </Box>
                            )}

                            {selectedView === 'contexts' && (
                                <Box sx={{ height: 600 }}>
                                    <ResponsiveBar
                                        data={tasks.reduce((acc, task) => {
                                            const context = task.contextCategory || 'uncategorized';
                                            acc[context] = (acc[context] || 0) + 1;
                                            return acc;
                                        }, {} as Record<string, number>)}
                                        keys={['value']}
                                        indexBy="context"
                                        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                                        padding={0.3}
                                        valueScale={{ type: 'linear' }}
                                        colors={{ scheme: 'nivo' }}
                                        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Context',
                                            legendPosition: 'middle',
                                            legendOffset: 32
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Tasks',
                                            legendPosition: 'middle',
                                            legendOffset: -40
                                        }}
                                    />
                                </Box>
                            )}

                            {selectedView === 'timeline' && (
                                <Box sx={{ height: 600 }}>
                                    <ResponsiveCalendar
                                        data={tasks
                                            .filter(task => task.completedAt)
                                            .map(task => ({
                                                day: task.completedAt?.split('T')[0],
                                                value: task.cognitiveLoad
                                            }))}
                                        from={new Date(new Date().getFullYear(), 0, 1)}
                                        to={new Date(new Date().getFullYear(), 11, 31)}
                                        emptyColor="#eeeeee"
                                        colors={['#61cdbb', '#97e3d5', '#e8c1a0', '#f47560']}
                                        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                                        yearSpacing={40}
                                        monthBorderColor="#ffffff"
                                        dayBorderWidth={2}
                                        dayBorderColor="#ffffff"
                                    />
                                </Box>
                            )}

                            {selectedView === 'energy' && (
                                <Box sx={{ height: 600 }}>
                                    <ResponsiveBar
                                        data={energyData}
                                        keys={['energy']}
                                        indexBy="hour"
                                        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                                        padding={0.3}
                                        valueScale={{ type: 'linear' }}
                                        colors={{ scheme: 'nivo' }}
                                        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Hour of Day',
                                            legendPosition: 'middle',
                                            legendOffset: 32
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Energy Level',
                                            legendPosition: 'middle',
                                            legendOffset: -40
                                        }}
                                    />
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary" align="center">
                        Tip: Switch between views to understand your task patterns from different perspectives.
                        The dependency view helps identify task relationships, while the energy distribution
                        shows your most productive hours.
                    </Typography>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TaskVisualizationDashboard;
