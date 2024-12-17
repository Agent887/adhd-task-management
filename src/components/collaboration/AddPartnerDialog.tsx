import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography
} from '@mui/material';

interface Props {
    open: boolean;
    onClose: () => void;
    onAdd: (email: string) => Promise<void>;
}

export const AddPartnerDialog: React.FC<Props> = ({ open, onClose, onAdd }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!email) {
            setError('Email is required');
            return;
        }
        if (!email.includes('@')) {
            setError('Invalid email format');
            return;
        }
        try {
            await onAdd(email);
            setEmail('');
            setError('');
            onClose();
        } catch (error) {
            setError('Failed to add partner');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Collaboration Partner</DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    Enter the email address of the person you want to collaborate with.
                </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Email Address"
                    type="email"
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!error}
                    helperText={error}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    Add Partner
                </Button>
            </DialogActions>
        </Dialog>
    );
};
