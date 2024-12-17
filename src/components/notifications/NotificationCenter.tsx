import React, { useEffect, useState } from 'react';
import {
    Box,
    Drawer,
    IconButton,
    Typography,
    Badge,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    useTheme,
    Slide,
    Paper,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    EmojiEvents as EmojiEventsIcon,
    AccessTime as AccessTimeIcon,
    BatteryAlert as BatteryAlertIcon,
    LocalCafe as LocalCafeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../../services/notification_service';

interface Props {
    notifications: Notification[];
    onNotificationRead: (id: string) => void;
    onClearAll: () => void;
}

export const NotificationCenter: React.FC<Props> = ({
    notifications,
    onNotificationRead,
    onClearAll,
}) => {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<Notification | null>(null);
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        // Show snackbar for new high-priority notifications
        const lastNotification = notifications[0];
        if (lastNotification && lastNotification.priority === 'high' && !lastNotification.read) {
            setSnackbar(lastNotification);
        }
    }, [notifications]);

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'progress':
                return <CheckCircleIcon color="success" />;
            case 'celebration':
                return <EmojiEventsIcon color="warning" />;
            case 'reminder':
                return <AccessTimeIcon color="info" />;
            case 'energy':
                return <BatteryAlertIcon color="error" />;
            case 'break':
                return <LocalCafeIcon color="primary" />;
            default:
                return <NotificationsIcon />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        onNotificationRead(notification.id);
        // Handle different notification types
        switch (notification.type) {
            case 'break':
                // Trigger break timer
                break;
            case 'energy':
                // Show energy management dialog
                break;
            case 'celebration':
                // Show celebration animation
                break;
        }
    };

    return (
        <>
            {/* Notification Button */}
            <IconButton
                color="inherit"
                onClick={() => setIsOpen(true)}
                sx={{
                    position: 'fixed',
                    right: theme.spacing(3),
                    top: theme.spacing(3),
                    zIndex: theme.zIndex.drawer + 1,
                }}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            {/* Notification Drawer */}
            <Drawer
                anchor="right"
                open={isOpen}
                onClose={() => setIsOpen(false)}
                PaperProps={{
                    sx: {
                        width: 320,
                        bgcolor: theme.palette.background.default,
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Notifications</Typography>
                        <IconButton onClick={onClearAll} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <List>
                        <AnimatePresence>
                            {notifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                >
                                    <ListItem
                                        button
                                        onClick={() => handleNotificationClick(notification)}
                                        sx={{
                                            mb: 1,
                                            borderRadius: 1,
                                            bgcolor: notification.read
                                                ? 'transparent'
                                                : `${theme.palette.primary.main}10`,
                                            border: `1px solid ${theme.palette.divider}`,
                                        }}
                                    >
                                        <ListItemIcon>
                                            {getNotificationIcon(notification.type)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={notification.title}
                                            secondary={
                                                <>
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
                                                        {notification.message}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="textSecondary"
                                                    >
                                                        {new Date(notification.timestamp).toLocaleTimeString()}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    {index < notifications.length - 1 && (
                                        <Divider variant="fullWidth" />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </List>
                </Box>
            </Drawer>

            {/* High Priority Snackbar */}
            <Snackbar
                open={!!snackbar}
                autoHideDuration={6000}
                onClose={() => setSnackbar(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar?.priority === 'high' ? 'error' : 'info'}
                    sx={{
                        width: '100%',
                        '& .MuiAlert-icon': {
                            fontSize: '2rem',
                        },
                    }}
                    icon={snackbar ? getNotificationIcon(snackbar.type) : undefined}
                >
                    <Typography variant="subtitle1">{snackbar?.title}</Typography>
                    <Typography variant="body2">{snackbar?.message}</Typography>
                </Alert>
            </Snackbar>
        </>
    );
};
