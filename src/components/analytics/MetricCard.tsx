import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    LinearProgress,
    useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface Props {
    title: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'success' | 'warning' | 'error' | 'info';
    icon?: React.ReactNode;
    percentage?: string;
}

export const MetricCard: React.FC<Props> = ({
    title,
    value,
    unit = '',
    trend = 'neutral',
    color = 'info',
    icon,
    percentage,
}) => {
    const theme = useTheme();

    const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up':
                return theme.palette.success.main;
            case 'down':
                return theme.palette.error.main;
            default:
                return theme.palette.text.secondary;
        }
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up':
                return <TrendingUpIcon sx={{ color: getTrendColor(trend) }} />;
            case 'down':
                return <TrendingDownIcon sx={{ color: getTrendColor(trend) }} />;
            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Card
                sx={{
                    height: '100%',
                    backgroundColor: theme.palette.background.paper,
                    '&:hover': {
                        boxShadow: theme.shadows[4],
                    },
                }}
            >
                <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                        {icon && (
                            <Box mr={1} color={color || theme.palette.primary.main}>
                                {icon}
                            </Box>
                        )}
                        <Typography variant="subtitle2" color="textSecondary">
                            {title}
                        </Typography>
                    </Box>
                    <Typography variant="h4" component="div" gutterBottom>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                        {unit && (
                            <Typography
                                component="span"
                                variant="subtitle1"
                                color="textSecondary"
                                sx={{ ml: 0.5 }}
                            >
                                {unit}
                            </Typography>
                        )}
                    </Typography>
                    {trend !== undefined && (
                        <Box display="flex" alignItems="center">
                            <Box
                                component="span"
                                sx={{
                                    color: getTrendColor(trend),
                                    display: 'flex',
                                    alignItems: 'center',
                                    mr: 1,
                                }}
                            >
                                {getTrendIcon(trend)}
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ ml: 0.5 }}
                                >
                                    {trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'Neutral'}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                vs last period
                            </Typography>
                        </Box>
                    )}
                    {percentage && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            {getTrendIcon(trend)}
                            <Typography
                                variant="body2"
                                sx={{ color: getTrendColor(trend), ml: 0.5 }}
                            >
                                {percentage}
                            </Typography>
                        </Box>
                    )}
                    <Box mt={2}>
                        <LinearProgress
                            variant="determinate"
                            value={typeof value === 'number' ? Math.min(value, 100) : 0}
                            sx={{
                                height: 4,
                                backgroundColor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: color || theme.palette.primary.main,
                                },
                            }}
                        />
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );
};
