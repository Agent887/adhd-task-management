import React from 'react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { PerformanceDataPoint } from '../../types/analytics';

interface PerformanceChartProps {
    title: string;
    data: PerformanceDataPoint[];
    dataKey: keyof Omit<PerformanceDataPoint, 'date'>;
    yAxisLabel?: string;
    color?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
    title,
    data,
    dataKey,
    yAxisLabel = 'Value',
    color = '#8884d8'
}) => {
    const theme = useTheme();

    return (
        <Paper
            sx={{
                p: 3,
                height: '400px',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>
            <Box height="90%">
                <div style={{ width: '100%', height: '100%' }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Box>
        </Paper>
    );
};

export default PerformanceChart;
