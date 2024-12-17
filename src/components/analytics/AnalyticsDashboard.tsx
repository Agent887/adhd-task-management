import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    useTheme,
} from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveCalendar } from '@nivo/calendar';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../../services/analytics_service';
import { TaskAnalytics } from '../../types/analytics';
import { InsightCard } from './InsightCard';
import { MetricCard } from './MetricCard';
import PerformanceChart from './PerformanceChart';
import { CognitiveLoadChart } from './CognitiveLoadChart';
import { EnergyPatternChart } from './EnergyPatternChart';

export const AnalyticsDashboard: React.FC = () => {
    const theme = useTheme();
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
    const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const data = await AnalyticsService.getAnalytics(timeRange);
            setAnalytics(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch analytics data');
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h4">Analytics Dashboard</Typography>
                        <FormControl variant="outlined" size="small">
                            <InputLabel>Time Range</InputLabel>
                            <Select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
                                label="Time Range"
                            >
                                <MenuItem value="day">Today</MenuItem>
                                <MenuItem value="week">This Week</MenuItem>
                                <MenuItem value="month">This Month</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Grid>

                {/* Performance Metrics */}
                <Grid item xs={12} md={4}>
                    <MetricCard
                        title="Task Completion Rate"
                        value={analytics?.completionRate || 0}
                        trend="up"
                        unit="%"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MetricCard
                        title="Average Focus Time"
                        value={analytics?.averageFocusTime || 0}
                        trend="up"
                        unit="min"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MetricCard
                        title="Productivity Score"
                        value={analytics?.productivityScore || 0}
                        trend="down"
                        unit="/100"
                    />
                </Grid>

                {/* Performance Chart */}
                <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <PerformanceChart
                            title="Task Completion Over Time"
                            data={analytics?.performanceData || []}
                            dataKey="completionRate"
                            yAxisLabel="Completion Rate (%)"
                            color={theme.palette.primary.main}
                        />
                    </Paper>
                </Grid>

                {/* Energy and Focus Chart */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <PerformanceChart
                            title="Focus Time Trends"
                            data={analytics?.performanceData || []}
                            dataKey="focusTime"
                            yAxisLabel="Focus Time (minutes)"
                            color={theme.palette.secondary.main}
                        />
                    </Paper>
                </Grid>

                {/* Productivity Chart */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <PerformanceChart
                            title="Productivity Score Trends"
                            data={analytics?.performanceData || []}
                            dataKey="productivityScore"
                            yAxisLabel="Productivity Score"
                            color={theme.palette.success.main}
                        />
                    </Paper>
                </Grid>

                {/* Cognitive Load Distribution */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <CognitiveLoadChart data={analytics?.cognitiveLoadDistribution || []} />
                    </Paper>
                </Grid>

                {/* Energy Patterns */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <EnergyPatternChart data={analytics?.energyPatterns || []} />
                    </Paper>
                </Grid>

                {/* Insights */}
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        Insights & Recommendations
                    </Typography>
                    <Grid container spacing={2}>
                        {analytics?.insights?.map((insight, index) => (
                            <Grid item xs={12} md={4} key={index}>
                                <InsightCard
                                    title={insight.title}
                                    description={insight.description}
                                    type={insight.type}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};
