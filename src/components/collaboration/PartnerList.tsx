import React from 'react';
import {
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Avatar,
    IconButton,
    Chip,
    Box,
    Typography,
    Tooltip,
    useTheme,
} from '@mui/material';
import {
    AccountCircle as AccountCircleIcon,
    Celebration as CelebrationIcon,
    Shield as ShieldIcon,
    Group as GroupIcon,
    Message as MessageIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Partner {
    id: string;
    name: string;
    email: string;
    role: 'accountability' | 'support' | 'collaborator';
    permissions: string[];
}

interface Props {
    partners: Partner[];
    onCelebrate: (partnerId: string) => void;
}

export const PartnerList: React.FC<Props> = ({ partners, onCelebrate }) => {
    const theme = useTheme();

    const getRoleIcon = (role: Partner['role']) => {
        switch (role) {
            case 'accountability':
                return <ShieldIcon fontSize="small" />;
            case 'support':
                return <GroupIcon fontSize="small" />;
            case 'collaborator':
                return <AccountCircleIcon fontSize="small" />;
            default:
                return <AccountCircleIcon fontSize="small" />;
        }
    };

    const getRoleColor = (role: Partner['role']) => {
        switch (role) {
            case 'accountability':
                return theme.palette.primary.main;
            case 'support':
                return theme.palette.success.main;
            case 'collaborator':
                return theme.palette.info.main;
            default:
                return theme.palette.grey[500];
        }
    };

    const getRoleLabel = (role: Partner['role']) => {
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <List>
            <AnimatePresence>
                {partners.map((partner) => (
                    <motion.div
                        key={partner.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ListItem
                            sx={{
                                mb: 1,
                                borderRadius: 1,
                                border: `1px solid ${theme.palette.divider}`,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                },
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar
                                    sx={{
                                        bgcolor: getRoleColor(partner.role),
                                    }}
                                >
                                    {partner.name.charAt(0).toUpperCase()}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box display="flex" alignItems="center">
                                        <Typography variant="subtitle1">
                                            {partner.name}
                                        </Typography>
                                        <Tooltip title={getRoleLabel(partner.role)}>
                                            <Chip
                                                icon={getRoleIcon(partner.role)}
                                                label={getRoleLabel(partner.role)}
                                                size="small"
                                                sx={{
                                                    ml: 1,
                                                    bgcolor: `${getRoleColor(partner.role)}20`,
                                                    color: getRoleColor(partner.role),
                                                    '& .MuiChip-icon': {
                                                        color: getRoleColor(partner.role),
                                                    },
                                                }}
                                            />
                                        </Tooltip>
                                    </Box>
                                }
                                secondary={
                                    <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {partner.email}
                                    </Typography>
                                }
                            />
                            <ListItemSecondaryAction>
                                <Box>
                                    <Tooltip title="Send message">
                                        <IconButton
                                            size="small"
                                            sx={{ mr: 1 }}
                                        >
                                            <MessageIcon />
                                        </IconButton>
                                    </Tooltip>
                                    {partner.role === 'accountability' && (
                                        <Tooltip title="Send celebration">
                                            <IconButton
                                                size="small"
                                                onClick={() => onCelebrate(partner.id)}
                                                sx={{
                                                    color: theme.palette.warning.main,
                                                    '&:hover': {
                                                        color: theme.palette.warning.dark,
                                                    },
                                                }}
                                            >
                                                <CelebrationIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </motion.div>
                ))}
            </AnimatePresence>
        </List>
    );
};
