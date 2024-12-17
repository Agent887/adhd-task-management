import React, { useEffect, useState } from 'react';
import {
    Fab,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Stack,
    Typography,
    Alert,
} from '@mui/material';
import {
    Mic as MicIcon,
    MicOff as MicOffIcon,
    Help as HelpIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { VoiceService } from '../../services/voice_service';
import { useTheme } from '@mui/material/styles';
import { useTasks } from '../../hooks/useTasks';

export const VoiceControl: React.FC = () => {
    const theme = useTheme();
    const { createTask, completeTask } = useTasks();
    const [voiceService] = useState(() => new VoiceService());
    const [isListening, setIsListening] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!voiceService.isSupported()) {
            setError('Voice commands are not supported in your browser');
            return;
        }

        // Register task-related commands
        voiceService.addCommand('create task', (args) => {
            const taskDetails = voiceService.parseTaskDetails(args);
            createTask({
                title: taskDetails.title,
                dueDate: taskDetails.dueDate,
                priority: taskDetails.priority,
            });
        });

        voiceService.addCommand('complete task', (taskName) => {
            completeTask(taskName);
        });

        return () => {
            voiceService.stopListening();
        };
    }, [voiceService, createTask, completeTask]);

    const toggleListening = () => {
        if (isListening) {
            voiceService.stopListening();
        } else {
            voiceService.startListening();
        }
        setIsListening(!isListening);
    };

    const commands = [
        {
            command: 'Create task',
            example: 'Create task buy groceries due tomorrow with priority high',
            description: 'Creates a new task with optional due date and priority',
        },
        {
            command: 'Complete task',
            example: 'Complete task buy groceries',
            description: 'Marks a task as complete',
        },
        {
            command: 'Add note',
            example: 'Add note remember to check expiry dates',
            description: 'Adds a note to the current task or creates a new note',
        },
        {
            command: 'Set priority',
            example: 'Set priority buy groceries to high',
            description: 'Changes the priority of a task',
        },
    ];

    return (
        <>
            <Stack direction="row" spacing={1} sx={{ position: 'fixed', bottom: 16, right: 16 }}>
                <Tooltip title="Voice Command Help">
                    <Fab
                        size="small"
                        color="primary"
                        onClick={() => setShowHelp(true)}
                        sx={{ mr: 1 }}
                    >
                        <HelpIcon />
                    </Fab>
                </Tooltip>
                <Tooltip title={isListening ? 'Stop Listening' : 'Start Voice Commands'}>
                    <Fab
                        color={isListening ? 'secondary' : 'primary'}
                        onClick={toggleListening}
                        disabled={!voiceService.isSupported()}
                    >
                        {isListening ? <MicOffIcon /> : <MicIcon />}
                    </Fab>
                </Tooltip>
            </Stack>

            {error && (
                <Alert 
                    severity="error" 
                    sx={{ position: 'fixed', bottom: 80, right: 16 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            <Dialog
                open={showHelp}
                onClose={() => setShowHelp(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        Voice Commands
                        <IconButton onClick={() => setShowHelp(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Use these voice commands to control Done365. Click the microphone button to start listening.
                    </DialogContentText>
                    <List>
                        {commands.map((cmd) => (
                            <ListItem key={cmd.command}>
                                <ListItemText
                                    primary={cmd.command}
                                    secondary={
                                        <>
                                            <Typography variant="body2" color="text.secondary">
                                                Example: "{cmd.example}"
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {cmd.description}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
            </Dialog>
        </>
    );
};
