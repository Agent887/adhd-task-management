import React from 'react';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from '@mui/lab';
import { Typography, Paper } from '@mui/material';
import { format } from 'date-fns';

interface ProgressUpdate {
    id: string;
    timestamp: Date;
    message: string;
    userId: string;
    userName: string;
}

interface Props {
    updates: ProgressUpdate[];
}

export const ProgressTimeline: React.FC<Props> = ({ updates }) => {
    return (
        <Timeline>
            {updates.map((update, index) => (
                <TimelineItem key={update.id}>
                    <TimelineOppositeContent>
                        <Typography color="textSecondary">
                            {format(new Date(update.timestamp), 'MMM d, yyyy h:mm a')}
                        </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot color="primary" />
                        {index < updates.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                        <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
                            <Typography variant="h6" component="h1">
                                {update.userName}
                            </Typography>
                            <Typography>{update.message}</Typography>
                        </Paper>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
};
