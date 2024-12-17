import React, { useEffect, useState } from 'react';
import { Box, Container, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface AdaptiveInterfaceProps {
    children: React.ReactNode;
    cognitiveState: {
        currentLoad: number;
        maxCapacity: number;
        energyLevel: number;
        focusLevel: number;
        timeOfDay: string;
    };
    uiAdaptation: {
        complexity: 'minimal' | 'moderate' | 'full';
        features: string[];
        layout: string;
        colorScheme: string;
        notifications: boolean;
    };
}

const AdaptiveInterface: React.FC<AdaptiveInterfaceProps> = ({
    children,
    cognitiveState,
    uiAdaptation
}) => {
    const theme = useTheme();
    const [containerStyle, setContainerStyle] = useState({});
    const [backgroundStyle, setBackgroundStyle] = useState({});

    useEffect(() => {
        updateStyles();
    }, [cognitiveState, uiAdaptation]);

    const updateStyles = () => {
        const newContainerStyle = {
            maxWidth: getMaxWidth(),
            padding: getPadding(),
            transition: 'all 0.3s ease',
        };

        const newBackgroundStyle = {
            backgroundColor: getBackgroundColor(),
            backgroundImage: getBackgroundPattern(),
            transition: 'all 0.3s ease',
        };

        setContainerStyle(newContainerStyle);
        setBackgroundStyle(newBackgroundStyle);
    };

    const getMaxWidth = () => {
        switch (uiAdaptation.layout) {
            case 'single-column':
                return '600px';
            case 'two-column':
                return '1000px';
            case 'dashboard':
                return '1400px';
            default:
                return '1200px';
        }
    };

    const getPadding = () => {
        switch (uiAdaptation.complexity) {
            case 'minimal':
                return theme.spacing(2);
            case 'moderate':
                return theme.spacing(3);
            case 'full':
                return theme.spacing(4);
        }
    };

    const getBackgroundColor = () => {
        const baseColor = theme.palette.background.default;
        
        switch (uiAdaptation.colorScheme) {
            case 'dark':
                return theme.palette.mode === 'dark' 
                    ? baseColor 
                    : theme.palette.grey[900];
            case 'calm':
                return alpha(theme.palette.info.light, 0.05);
            case 'focused':
                return alpha(theme.palette.primary.light, 0.05);
            default:
                return baseColor;
        }
    };

    const getBackgroundPattern = () => {
        if (cognitiveState.currentLoad > cognitiveState.maxCapacity * 0.8) {
            return 'none'; // Remove visual noise when cognitive load is high
        }

        switch (uiAdaptation.complexity) {
            case 'minimal':
                return 'none';
            case 'moderate':
                return `linear-gradient(${alpha(theme.palette.primary.main, 0.03)} 1px, transparent 1px)`;
            case 'full':
                return `
                    linear-gradient(${alpha(theme.palette.primary.main, 0.03)} 1px, transparent 1px),
                    linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.03)} 1px, transparent 1px)
                `;
        }
    };

    const getFilteredChildren = () => {
        if (uiAdaptation.complexity === 'minimal') {
            // Only render essential UI components when cognitive load is high
            return React.Children.map(children, child => {
                const childType = (child as any)?.type?.displayName;
                if (childType && uiAdaptation.features.includes(childType)) {
                    return child;
                }
                return null;
            });
        }
        return children;
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                ...backgroundStyle,
            }}
        >
            <Container
                sx={{
                    ...containerStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing(2),
                }}
            >
                {getFilteredChildren()}
            </Container>
        </Box>
    );
};

export default AdaptiveInterface;
