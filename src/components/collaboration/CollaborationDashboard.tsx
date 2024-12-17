import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    CircularProgress,
    Chip,
    IconButton,
    useTheme,
} from '@mui/material';
import {
    Add as AddIcon,
    Celebration as CelebrationIcon,
    Group as GroupIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { SharedTaskList } from './SharedTaskList';
import { PartnerList } from './PartnerList';
import { AddPartnerDialog } from './AddPartnerDialog';
import { ProgressTimeline } from './ProgressTimeline';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useNotification } from '../../hooks/useNotification';
import { SharedTask, CollaborationPartner, CollaboratorRole } from '../../types/collaboration';

const CollaborationDashboard: React.FC = () => {
    const theme = useTheme();
    const [isAddPartnerOpen, setAddPartnerOpen] = useState(false);
    const { showNotification } = useNotification();
    
    const {
        sharedTasks,
        partners,
        loading,
        addPartner,
        updateTaskProgress,
        addTaskComment,
    } = useCollaboration();

    const [selectedTask, setSelectedTask] = useState<string | null>(null);

    const handleAddPartner = async (email: string, role: CollaboratorRole) => {
        try {
            await addPartner(email, role);
            showNotification('Partner added successfully!', 'success');
            setAddPartnerOpen(false);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add partner';
            showNotification(errorMessage, 'error');
        }
    };

    const handleProgressUpdate = async (taskId: string, progress: number) => {
        try {
            await updateTaskProgress(taskId, progress);
            showNotification('Progress updated!', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update progress';
            showNotification(errorMessage, 'error');
        }
    };

    const handleCelebration = async (taskId: string) => {
        try {
            await addTaskComment(taskId, '🎉 Great work! Keep it up!', 'celebration');
            showNotification('Celebration sent!', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send celebration';
            showNotification(errorMessage, 'error');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Grid container spacing={3}>
                    {/* Header */}
                    <Grid item xs={12}>
                        <Paper 
                            elevation={2}
                            sx={{
                                p: 2,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: theme.palette.primary.main,
                                color: 'white',
                            }}
                        >
                            <Box display="flex" alignItems="center">
                                <GroupIcon sx={{ mr: 1 }} />
                                <Typography variant="h5">
                                    Collaboration Hub
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<AddIcon />}
                                onClick={() => setAddPartnerOpen(true)}
                            >
                                Add Partner
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Partners List */}
                    <Grid item xs={12} md={4}>
                        <Paper 
                            elevation={2}
                            sx={{
                                p: 2,
                                height: '100%',
                                minHeight: 400,
                                overflow: 'hidden',
                            }}
                        >
                            <Typography variant="h6" gutterBottom>
                                Your Support Network
                            </Typography>
                            {loading ? (
                                <Box display="flex" justifyContent="center" p={3}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <PartnerList 
                                    partners={partners}
                                    onCelebrate={handleCelebration}
                                />
                            )}
                        </Paper>
                    </Grid>

                    {/* Shared Tasks */}
                    <Grid item xs={12} md={8}>
                        <Paper 
                            elevation={2}
                            sx={{
                                p: 2,
                                height: '100%',
                                minHeight: 400,
                                overflow: 'hidden',
                            }}
                        >
                            <Typography variant="h6" gutterBottom>
                                Shared Tasks
                            </Typography>
                            {loading ? (
                                <Box display="flex" justifyContent="center" p={3}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <SharedTaskList
                                    tasks={sharedTasks}
                                    onProgressUpdate={handleProgressUpdate}
                                    onTaskSelect={setSelectedTask}
                                />
                            )}
                        </Paper>
                    </Grid>

                    {/* Progress Timeline */}
                    {selectedTask && (
                        <Grid item xs={12}>
                            <Paper 
                                elevation={2}
                                sx={{ p: 2 }}
                            >
                                <Box display="flex" alignItems="center" mb={2}>
                                    <TimelineIcon sx={{ mr: 1 }} />
                                    <Typography variant="h6">
                                        Progress Timeline
                                    </Typography>
                                </Box>
                                <ProgressTimeline taskId={selectedTask} />
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            </motion.div>

            {/* Add Partner Dialog */}
            <AddPartnerDialog
                open={isAddPartnerOpen}
                onClose={() => setAddPartnerOpen(false)}
                onAdd={handleAddPartner}
            />
        </Box>
    );
};

export { CollaborationDashboard };
