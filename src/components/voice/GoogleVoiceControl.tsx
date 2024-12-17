import React, { useState, useRef } from 'react';
import {
    Fab,
    Tooltip,
    CircularProgress,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    Typography,
    Box
} from '@mui/material';
import {
    Mic as MicIcon,
    Stop as StopIcon
} from '@mui/icons-material';
import { GoogleVoiceService } from '../../services/google_voice_service';
import { useTasks } from '../../hooks/useTasks';

export const GoogleVoiceControl: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysis, setAnalysis] = useState<string>('');
    
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const voiceService = useRef(new GoogleVoiceService());
    const { createTask, updateTask } = useTasks();

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                processRecording(audioBlob);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setFeedback('Listening...');
        } catch (err) {
            setError('Failed to access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            setFeedback('Processing your request...');
            setIsProcessing(true);
        }
    };

    const processRecording = async (audioBlob: Blob) => {
        try {
            const analysisResult = await voiceService.current.voiceToTaskAnalysis(audioBlob);
            setAnalysis(analysisResult);
            setShowAnalysis(true);
            setIsProcessing(false);
            setFeedback('Analysis complete!');

            // Parse the analysis and create/update tasks as needed
            // This is a simplified example - you'd want to parse the Gemini response more thoroughly
            if (analysisResult.toLowerCase().includes('task')) {
                const taskDetails = extractTaskDetails(analysisResult);
                await createTask(taskDetails);
            }
        } catch (err) {
            setError('Failed to process voice command. Please try again.');
            setIsProcessing(false);
        }
    };

    const extractTaskDetails = (analysis: string) => {
        // This is a simplified example - you'd want to implement more robust parsing
        return {
            title: analysis.split('\n')[0],
            description: analysis,
            priority: analysis.toLowerCase().includes('high priority') ? 'high' : 'medium',
            dueDate: null // You'd want to extract this from the analysis
        };
    };

    return (
        <>
            <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
                <Tooltip title={isRecording ? 'Stop Recording' : 'Start Voice Command'}>
                    <Fab
                        color={isRecording ? 'secondary' : 'primary'}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : isRecording ? (
                            <StopIcon />
                        ) : (
                            <MicIcon />
                        )}
                    </Fab>
                </Tooltip>
            </Box>

            <Snackbar
                open={!!feedback}
                autoHideDuration={6000}
                onClose={() => setFeedback(null)}
                message={feedback}
            />

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>

            <Dialog
                open={showAnalysis}
                onClose={() => setShowAnalysis(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Task Analysis</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Here's what I understood from your voice command:
                    </DialogContentText>
                    <Typography
                        variant="body1"
                        component="pre"
                        sx={{ 
                            mt: 2,
                            p: 2,
                            backgroundColor: 'grey.100',
                            borderRadius: 1,
                            whiteSpace: 'pre-wrap'
                        }}
                    >
                        {analysis}
                    </Typography>
                </DialogContent>
            </Dialog>
        </>
    );
};
