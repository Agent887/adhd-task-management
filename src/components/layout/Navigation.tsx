import React, { useState } from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Toolbar,
    Typography,
    useTheme,
} from '@mui/material';
import {
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    Dashboard as DashboardIcon,
    AccountTree,
    SwapHoriz,
    Timeline,
    Settings as SettingsIcon,
    BubbleChart,
    Battery80 as EnergyIcon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { CalendarIntegration } from '../calendar/CalendarIntegration';
import { GoogleVoiceControl } from '../voice/GoogleVoiceControl';

const drawerWidth = 240;

export const Navigation: React.FC = () => {
    const theme = useTheme();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const menuItems = [
        {
            text: 'Dashboard',
            icon: <DashboardIcon />,
            path: '/',
        },
        {
            text: 'Task Visualization',
            icon: <BubbleChart />,
            path: '/visualization',
        },
        {
            text: 'Context Manager',
            icon: <SwapHoriz />,
            path: '/contexts',
        },
        {
            text: 'Dependencies',
            icon: <AccountTree />,
            path: '/dependencies',
        },
        {
            text: 'Energy Tracking',
            icon: <EnergyIcon />,
            path: '/energy',
        },
        {
            text: 'Analytics',
            icon: <Timeline />,
            path: '/analytics',
        },
        {
            text: 'Settings',
            icon: <SettingsIcon />,
            path: '/settings',
        },
    ];

    const drawer = (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Done365
                </Typography>
            </Toolbar>
            <Divider />
            <Stack spacing={2} sx={{ p: 2 }}>
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                selected={location.pathname === item.path}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: location.pathname === item.path
                                            ? theme.palette.primary.main
                                            : 'inherit',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                <CalendarIntegration />
            </Stack>
        </div>
    );

    return (
        <div>
            <Box sx={{ display: 'flex' }}>
                <CssBaseline />
                <AppBar
                    position="fixed"
                    sx={{
                        width: { sm: `calc(100% - ${drawerWidth}px)` },
                        ml: { sm: `${drawerWidth}px` },
                    }}
                >
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap component="div">
                            {menuItems.find((item) => item.path === location.pathname)?.text || 'Done365'}
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box
                    component="nav"
                    sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                    aria-label="mailbox folders"
                >
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                        }}
                        sx={{
                            display: { xs: 'block', sm: 'none' },
                            '& .MuiDrawer-paper': {
                                boxSizing: 'border-box',
                                width: drawerWidth,
                            },
                        }}
                    >
                        {drawer}
                    </Drawer>
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: 'none', sm: 'block' },
                            '& .MuiDrawer-paper': {
                                boxSizing: 'border-box',
                                width: drawerWidth,
                            },
                        }}
                        open
                    >
                        {drawer}
                    </Drawer>
                </Box>
                <Box>
                    <GoogleVoiceControl />
                </Box>
            </Box>
        </div>
    );
};
