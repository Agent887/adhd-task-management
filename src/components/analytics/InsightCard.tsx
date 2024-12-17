import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import InfoIcon from '@mui/icons-material/Info';

interface Props {
    title: string;
    description: string;
    type: 'success' | 'challenge' | 'pattern' | 'suggestion';
}

export const InsightCard: React.FC<Props> = ({ title, description, type }) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success':
                return '#4CAF50'; // Green
            case 'challenge':
                return '#FF9800'; // Orange
            case 'pattern':
                return '#2196F3'; // Blue
            case 'suggestion':
                return '#9C27B0'; // Purple
            default:
                return '#9E9E9E'; // Grey
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&:hover': {
                        boxShadow: (theme) => theme.shadows[4],
                    },
                }}
            >
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Chip
                            label={type.charAt(0).toUpperCase() + type.slice(1)}
                            size="small"
                            sx={{
                                backgroundColor: getTypeColor(type),
                                color: 'white',
                            }}
                        />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                </CardContent>
            </Card>
        </motion.div>
    );
};
