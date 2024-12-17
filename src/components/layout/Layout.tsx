import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { Navigation } from './Navigation';

interface LayoutProps {
    children: React.ReactNode;
}

const drawerWidth = 240;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Navigation />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    backgroundColor: (theme) => theme.palette.grey[100],
                    minHeight: '100vh',
                }}
            >
                <Toolbar /> {/* This adds space for the AppBar */}
                {children}
            </Box>
        </Box>
    );
};
