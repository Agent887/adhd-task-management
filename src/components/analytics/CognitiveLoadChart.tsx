import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { TaskAnalytics } from '../../types/analytics';

interface Props {
    data: TaskAnalytics['cognitiveLoadDistribution'];
}

interface PieDataItem {
    id: string;
    label: string;
    value: number;
}

export const CognitiveLoadChart: React.FC<Props> = ({ data }) => {
    const theme = useTheme();

    const formattedData: PieDataItem[] = data.map((item) => ({
        id: item.load,
        label: item.load.charAt(0).toUpperCase() + item.load.slice(1),
        value: item.percentage,
    }));

    const getLoadColor = (load: string) => {
        switch (load.toLowerCase()) {
            case 'low':
                return theme.palette.success.main;
            case 'medium':
                return theme.palette.warning.main;
            case 'high':
                return theme.palette.error.main;
            default:
                return theme.palette.grey[500];
        }
    };

    return (
        <Paper
            sx={{
                p: 3,
                height: '400px',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            <Typography variant="h6" gutterBottom>
                Cognitive Load Distribution
            </Typography>
            <Box height="90%">
                <ResponsivePie<PieDataItem>
                    data={formattedData}
                    margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                    innerRadius={0.5}
                    padAngle={0.7}
                    cornerRadius={3}
                    colors={({ id }) => getLoadColor(id)}
                    borderWidth={1}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    arcLabel={d => `${d.value}%`}
                    arcLabelsSkipAngle={10}
                    arcLinkLabelsTextColor={theme.palette.text.primary}
                    arcLinkLabelsThickness={2}
                    arcLinkLabelsColor={{ from: 'color' }}
                    animate={true}
                    motionConfig="gentle"
                    legends={[
                        {
                            anchor: 'bottom',
                            direction: 'row',
                            translateY: 56,
                            itemWidth: 100,
                            itemHeight: 18,
                            itemTextColor: theme.palette.text.primary,
                            symbolSize: 18,
                            symbolShape: 'circle',
                        },
                    ]}
                />
            </Box>
        </Paper>
    );
};

export default CognitiveLoadChart;
