import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { Box, Paper, Typography, useTheme } from '@mui/material';

interface EnergyData {
    hour: number;
    level: number;
}

interface Props {
    data: EnergyData[];
}

export const EnergyPatternChart: React.FC<Props> = ({ data }) => {
    const theme = useTheme();

    const formattedData = [
        {
            id: 'energy',
            data: data.map((point) => ({
                x: point.hour,
                y: point.level,
            })),
        },
    ];

    return (
        <Paper
            sx={{
                p: 3,
                height: '400px',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            <Typography variant="h6" gutterBottom>
                Daily Energy Pattern
            </Typography>
            <Box height="90%">
                <ResponsiveLine
                    data={formattedData}
                    margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                    xScale={{
                        type: 'linear',
                        min: 0,
                        max: 23,
                    }}
                    yScale={{
                        type: 'linear',
                        min: 0,
                        max: 10,
                    }}
                    curve="cardinal"
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Hour of Day',
                        legendOffset: 36,
                        legendPosition: 'middle',
                        format: (value) => `${value}:00`,
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Energy Level',
                        legendOffset: -40,
                        legendPosition: 'middle',
                    }}
                    enablePoints={true}
                    pointSize={8}
                    pointColor={{ theme: 'background' }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: 'serieColor' }}
                    pointLabelYOffset={-12}
                    enableArea={true}
                    areaOpacity={0.15}
                    useMesh={true}
                    enableGridX={false}
                    theme={{
                        axis: {
                            ticks: {
                                text: {
                                    fill: theme.palette.text.secondary,
                                },
                            },
                            legend: {
                                text: {
                                    fill: theme.palette.text.primary,
                                },
                            },
                        },
                        grid: {
                            line: {
                                stroke: theme.palette.divider,
                            },
                        },
                        crosshair: {
                            line: {
                                stroke: theme.palette.primary.main,
                                strokeWidth: 1,
                                strokeOpacity: 0.35,
                            },
                        },
                        tooltip: {
                            container: {
                                background: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                fontSize: 12,
                                borderRadius: 4,
                                boxShadow: theme.shadows[3],
                            },
                        },
                    }}
                    colors={[theme.palette.secondary.main]}
                    tooltip={({ point }) => (
                        <Box
                            sx={{
                                padding: 1,
                                background: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            <Typography variant="body2">
                                {`${point.data.x}:00 - Energy Level: ${point.data.y}/10`}
                            </Typography>
                        </Box>
                    )}
                />
            </Box>
        </Paper>
    );
};
