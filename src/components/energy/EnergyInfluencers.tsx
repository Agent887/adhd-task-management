import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../../utils/api';

interface EnergyInfluencer {
    id: number;
    factor_type: string;
    impact_level: number;
    description: string;
    frequency: string;
}

export const EnergyInfluencers: React.FC = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [influencers, setInfluencers] = useState<EnergyInfluencer[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInfluencer, setEditingInfluencer] = useState<EnergyInfluencer | null>(null);
    const [formData, setFormData] = useState<Partial<EnergyInfluencer>>({
        factor_type: '',
        impact_level: 0,
        description: '',
        frequency: '',
    });

    useEffect(() => {
        fetchInfluencers();
    }, []);

    const fetchInfluencers = async () => {
        try {
            const response = await api.get('/api/energy/influencers');
            setInfluencers(response.data);
        } catch (error) {
            enqueueSnackbar('Failed to fetch energy influencers', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (influencer?: EnergyInfluencer) => {
        if (influencer) {
            setEditingInfluencer(influencer);
            setFormData(influencer);
        } else {
            setEditingInfluencer(null);
            setFormData({
                factor_type: '',
                impact_level: 0,
                description: '',
                frequency: '',
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingInfluencer(null);
        setFormData({
            factor_type: '',
            impact_level: 0,
            description: '',
            frequency: '',
        });
    };

    const handleSubmit = async () => {
        try {
            if (editingInfluencer) {
                await api.put(`/api/energy/influencers/${editingInfluencer.id}`, formData);
                enqueueSnackbar('Energy influencer updated successfully', { variant: 'success' });
            } else {
                await api.post('/api/energy/influencers', formData);
                enqueueSnackbar('Energy influencer added successfully', { variant: 'success' });
            }
            handleCloseDialog();
            fetchInfluencers();
        } catch (error) {
            enqueueSnackbar(
                `Failed to ${editingInfluencer ? 'update' : 'add'} energy influencer`,
                { variant: 'error' }
            );
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/api/energy/influencers/${id}`);
            enqueueSnackbar('Energy influencer deleted successfully', { variant: 'success' });
            fetchInfluencers();
        } catch (error) {
            enqueueSnackbar('Failed to delete energy influencer', { variant: 'error' });
        }
    };

    const getImpactColor = (impact: number) => {
        if (impact > 3) return 'success';
        if (impact > 0) return 'info';
        if (impact < -3) return 'error';
        if (impact < 0) return 'warning';
        return 'default';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Card elevation={3}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h6">Energy Influencers</Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                        >
                            Add Influencer
                        </Button>
                    </Box>

                    <List>
                        {influencers.map((influencer) => (
                            <ListItem key={influencer.id} divider>
                                <ListItemText
                                    primary={influencer.description}
                                    secondary={
                                        <Box display="flex" gap={1} mt={1}>
                                            <Chip
                                                label={influencer.factor_type}
                                                size="small"
                                                color="primary"
                                            />
                                            <Chip
                                                label={`Impact: ${influencer.impact_level}`}
                                                size="small"
                                                color={getImpactColor(influencer.impact_level)}
                                            />
                                            <Chip
                                                label={influencer.frequency}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Box>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        aria-label="edit"
                                        onClick={() => handleOpenDialog(influencer)}
                                        sx={{ mr: 1 }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => handleDelete(influencer.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingInfluencer ? 'Edit Energy Influencer' : 'Add Energy Influencer'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Factor Type</InputLabel>
                                <Select
                                    value={formData.factor_type}
                                    onChange={(e) =>
                                        setFormData({ ...formData, factor_type: e.target.value })
                                    }
                                    label="Factor Type"
                                >
                                    <MenuItem value="sleep">Sleep</MenuItem>
                                    <MenuItem value="medication">Medication</MenuItem>
                                    <MenuItem value="exercise">Exercise</MenuItem>
                                    <MenuItem value="nutrition">Nutrition</MenuItem>
                                    <MenuItem value="stress">Stress</MenuItem>
                                    <MenuItem value="environment">Environment</MenuItem>
                                    <MenuItem value="social">Social</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography gutterBottom>Impact Level (-5 to +5)</Typography>
                            <Slider
                                value={formData.impact_level}
                                onChange={(_, value) =>
                                    setFormData({ ...formData, impact_level: value as number })
                                }
                                min={-5}
                                max={5}
                                step={1}
                                marks
                                valueLabelDisplay="auto"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                multiline
                                rows={2}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Frequency</InputLabel>
                                <Select
                                    value={formData.frequency}
                                    onChange={(e) =>
                                        setFormData({ ...formData, frequency: e.target.value })
                                    }
                                    label="Frequency"
                                >
                                    <MenuItem value="always">Always</MenuItem>
                                    <MenuItem value="often">Often</MenuItem>
                                    <MenuItem value="sometimes">Sometimes</MenuItem>
                                    <MenuItem value="rarely">Rarely</MenuItem>
                                    <MenuItem value="variable">Variable</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {editingInfluencer ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
