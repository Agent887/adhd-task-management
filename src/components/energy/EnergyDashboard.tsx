import React, { useState } from 'react';
import {
    Box,
    Container,
    Tab,
    Tabs,
    Typography,
    Paper,
} from '@mui/material';
import {
    Timeline as TimelineIcon,
    Assessment as AssessmentIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { EnergyTracker } from './EnergyTracker';
import { EnergyAnalysis } from './EnergyAnalysis';
import { EnergyInfluencers } from './EnergyInfluencers';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`energy-tabpanel-${index}`}
            aria-labelledby={`energy-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `energy-tab-${index}`,
        'aria-controls': `energy-tabpanel-${index}`,
    };
}

export const EnergyDashboard: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth="lg">
            <Box mb={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Energy & Focus Management
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Track, analyze, and optimize your energy levels for better task management
                </Typography>
            </Box>

            <Paper elevation={3}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="energy management tabs"
                    variant="fullWidth"
                >
                    <Tab
                        icon={<TimelineIcon />}
                        label="Track"
                        {...a11yProps(0)}
                    />
                    <Tab
                        icon={<AssessmentIcon />}
                        label="Analysis"
                        {...a11yProps(1)}
                    />
                    <Tab
                        icon={<TrendingUpIcon />}
                        label="Influencers"
                        {...a11yProps(2)}
                    />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <EnergyTracker />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <EnergyAnalysis />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <EnergyInfluencers />
                </TabPanel>
            </Paper>
        </Container>
    );
};
