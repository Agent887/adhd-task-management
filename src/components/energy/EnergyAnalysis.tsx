import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Paper,
} from '@mui/material';
import {
    TrendingUp,
    Schedule,
    Lightbulb,
    Warning,
    CheckCircle,
    AccessTime,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../../utils/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface PeakTime {
    day_of_week: number;
    start_hour: number;
    end_hour: number;
    avg_energy: number;
    confidence: number;
}

interface Pattern {
    day_of_week: number;
    hour: number;
    avg_energy_level: number;
    avg_focus_level: number;
    confidence_score: number;
}

interface AnalysisSection {
    title: string;
    items: string[];
}

interface ChartData {
    hour: number;
    energyLevel: number;
}

interface EnergyData {
    peakTimes: PeakTime[];
    patterns: Pattern[];
    chartData: ChartData[];
    analysis: {
        strengths: AnalysisSection;
        challenges: AnalysisSection;
        focus_areas: AnalysisSection;
    };
}

interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        dataKey: string;
    }>;
    label?: string;
}

const formatHour = (hour: number): string => {
    const h = hour % 24;
    const ampm = h < 12 ? 'AM' : 'PM';
    const formattedHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${formattedHour}${ampm}`;
};

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <Paper sx={{ p: 1 }}>
                <Typography variant="body2">
                    {`Time: ${formatHour(Number(label))}`}
                </Typography>
                <Typography variant="body2" color="primary">
                    {`Energy Level: ${payload[0].value}`}
                </Typography>
            </Paper>
        );
    }
    return null;
};

const EnergyAnalysis: React.FC = () => {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [peakTimes, setPeakTimes] = useState<PeakTime[]>([]);
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [analysis, setAnalysis] = useState<EnergyData | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [peakTimesRes, patternsRes, analysisRes] = await Promise.all([
                api.get('/api/energy/peak-times'),
                api.get('/api/energy/patterns'),
                api.get('/api/energy/analysis'),
            ]);

            setPeakTimes(peakTimesRes.data);
            setPatterns(patternsRes.data);
            setAnalysis(analysisRes.data);
        } catch (error) {
            enqueueSnackbar('Failed to fetch energy analysis', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const getDayName = (day: number): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day];
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Grid container spacing={3}>
            {/* Peak Times Card */}
            <Grid item xs={12} md={6}>
                <Card elevation={3}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <AccessTime sx={{ mr: 1 }} />
                            Peak Performance Times
                        </Typography>
                        <List>
                            {peakTimes.map((peak, index) => (
                                <React.Fragment key={index}>
                                    <ListItem>
                                        <ListItemIcon>
                                            <Schedule />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={`${getDayName(peak.day_of_week)}`}
                                            secondary={`${formatHour(peak.start_hour)} - ${formatHour(
                                                peak.end_hour
                                            )}`}
                                        />
                                        <Chip
                                            label={`Energy: ${peak.avg_energy.toFixed(1)}/5`}
                                            color={peak.avg_energy > 3.5 ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </ListItem>
                                    {index < peakTimes.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            </Grid>

            {/* Energy Patterns Chart */}
            <Grid item xs={12} md={6}>
                <Card elevation={3}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <TrendingUp sx={{ mr: 1 }} />
                            Energy Patterns
                        </Typography>
                        <Box height={300}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analysis?.chartData}>
                                    <XAxis
                                        dataKey="hour"
                                        tickFormatter={formatHour}
                                    />
                                    <YAxis domain={[1, 5]} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="energyLevel"
                                        stroke={theme.palette.primary.main}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            {/* Analysis Sections */}
            {analysis && (
                <Grid item xs={12}>
                    <Card elevation={3}>
                        <CardContent>
                            <Grid container spacing={3}>
                                {/* Patterns */}
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom>
                                        <TrendingUp sx={{ mr: 1 }} />
                                        Identified Patterns
                                    </Typography>
                                    <List>
                                        {analysis.analysis.strengths.items.map((item, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <CheckCircle color="primary" />
                                                </ListItemIcon>
                                                <ListItemText primary={item} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>

                                {/* Influencing Factors */}
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom>
                                        <Lightbulb sx={{ mr: 1 }} />
                                        Influencing Factors
                                    </Typography>
                                    <List>
                                        {analysis.analysis.challenges.items.map((item, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <Warning color="warning" />
                                                </ListItemIcon>
                                                <ListItemText primary={item} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>

                                {/* Recommendations */}
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        <Lightbulb sx={{ mr: 1 }} />
                                        Recommendations
                                    </Typography>
                                    <List>
                                        {analysis.analysis.focus_areas.items.map((item, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <CheckCircle color="success" />
                                                </ListItemIcon>
                                                <ListItemText primary={item} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            )}
        </Grid>
    );
};

export { EnergyAnalysis };
