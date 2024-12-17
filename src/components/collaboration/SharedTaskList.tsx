import React from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Box,
    LinearProgress,
    Typography,
    Tooltip,
    useTheme,
} from '@mui/material';
import {
    Comment as CommentIcon,
    EmojiEvents as EmojiEventsIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { SharedTask } from '../../types/collaboration';

interface Props {
    tasks: SharedTask[];
    onProgressUpdate: (taskId: string, progress: number) => void;
    onTaskSelect: (taskId: string) => void;
}

export const SharedTaskList: React.FC<Props> = ({
    tasks,
    onProgressUpdate,
    onTaskSelect,
}) => {
    const theme = useTheme();

    const getProgressColor = (progress: number) => {
        if (progress >= 75) return theme.palette.success.main;
        if (progress >= 50) return theme.palette.info.main;
        if (progress >= 25) return theme.palette.warning.main;
        return theme.palette.error.main;
    };

    const getStatusChipColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'success';
            case 'in_progress':
                return 'primary';
            case 'stuck':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <List>
            <AnimatePresence>
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ListItem
                            button
                            onClick={() => onTaskSelect(task.id)}
                            sx={{
                                mb: 1,
                                borderRadius: 1,
                                border: `1px solid ${theme.palette.divider}`,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                },
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Box display="flex" alignItems="center">
                                        <Typography variant="subtitle1">
                                            {task.title}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={task.status}
                                            color={getStatusChipColor(task.status) as any}
                                            sx={{ ml: 1 }}
                                        />
                                    </Box>
                                }
                                secondary={
                                    <Box sx={{ mt: 1 }}>
                                        <Box display="flex" alignItems="center" mb={0.5}>
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                                sx={{ mr: 1 }}
                                            >
                                                Progress:
                                            </Typography>
                                            <Box sx={{ flexGrow: 1, mr: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={task.progress}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: theme.palette.grey[200],
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: getProgressColor(task.progress),
                                                        },
                                                    }}
                                                />
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                            >
                                                {task.progress}%
                                            </Typography>
                                        </Box>
                                        {task.description && (
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {task.description}
                                            </Typography>
                                        )}
                                    </Box>
                                }
                            />
                            <ListItemSecondaryAction>
                                <Box display="flex" alignItems="center">
                                    {task.comments.length > 0 && (
                                        <Tooltip title={`${task.comments.length} comments`}>
                                            <IconButton size="small">
                                                <CommentIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {task.progress === 100 && (
                                        <Tooltip title="Task completed!">
                                            <IconButton size="small" color="success">
                                                <EmojiEventsIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <IconButton size="small">
                                        <MoreVertIcon />
                                    </IconButton>
                                </Box>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </motion.div>
                ))}
            </AnimatePresence>
        </List>
    );
};
