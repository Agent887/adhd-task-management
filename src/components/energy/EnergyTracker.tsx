import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    TextField,
    CircularProgress,
} from '@mui/material';
import { BatteryChargingFull, Psychology, Mood, Bedtime } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../../utils/api';

interface EnergyLevel {
    energy_level: number;
    focus_level: number;
    mood?: string;
    stress_level?: number;
    sleep_quality?: number;
    medication_taken?: boolean;
    notes?: string;
}

export const EnergyTracker: React.FC = () => {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [energyData, setEnergyData] = useState<EnergyLevel>({
        energy_level: 3,
        focus_level: 3,
        mood: 'neutral',
        stress_level: 3,
        sleep_quality: 3,
        medication_taken: false,
        notes: '',
    });

    const handleSliderChange = (field: keyof EnergyLevel) => (
        _event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
        value: number | number[]
    ) => {
        setEnergyData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleMoodChange = (event: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        setEnergyData(prev => ({
            ...prev,
            mood: event.target.value as string
        }));
    };

    const handleMedicationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEnergyData(prev => ({
            ...prev,
            medication_taken: event.target.checked,
        }));
    };

    const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEnergyData(prev => ({
            ...prev,
            notes: event.target.value,
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/api/energy/record', energyData);
            enqueueSnackbar('Energy levels recorded successfully!', { variant: 'success' });
            
            // Reset form to default values
            setEnergyData({
                energy_level: 3,
                focus_level: 3,
                mood: 'neutral',
                stress_level: 3,
                sleep_quality: 3,
                medication_taken: false,
                notes: '',
            });
        } catch (error) {
            enqueueSnackbar('Failed to record energy levels', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const getSliderColor = (value: number) => {
        if (value <= 2) return theme.palette.error.main;
        if (value <= 3) return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    return (
        <Card elevation={3}>
            <CardContent>
                <Typography variant="h5" gutterBottom>
                    Track Your Energy & Focus
                </Typography>

                <Grid container spacing={3}>
                    {/* Energy Level */}
                    <Grid item xs={12} md={6}>
                        <Box mb={2}>
                            <Typography gutterBottom>
                                <BatteryChargingFull /> Energy Level
                            </Typography>
                            <Slider
                                value={energyData.energy_level}
                                onChange={handleSliderChange('energy_level')}
                                min={1}
                                max={5}
                                step={1}
                                marks
                                sx={{
                                    color: getSliderColor(energyData.energy_level),
                                }}
                            />
                        </Box>
                    </Grid>

                    {/* Focus Level */}
                    <Grid item xs={12} md={6}>
                        <Box mb={2}>
                            <Typography gutterBottom>
                                <Psychology /> Focus Level
                            </Typography>
                            <Slider
                                value={energyData.focus_level}
                                onChange={handleSliderChange('focus_level')}
                                min={1}
                                max={5}
                                step={1}
                                marks
                                sx={{
                                    color: getSliderColor(energyData.focus_level),
                                }}
                            />
                        </Box>
                    </Grid>

                    {/* Mood */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel><Mood /> Mood</InputLabel>
                            <Select
                                value={energyData.mood}
                                onChange={handleMoodChange}
                                label="Mood"
                            >
                                <MenuItem value="great">Great 😄</MenuItem>
                                <MenuItem value="good">Good 🙂</MenuItem>
                                <MenuItem value="neutral">Neutral 😐</MenuItem>
                                <MenuItem value="low">Low 😕</MenuItem>
                                <MenuItem value="poor">Poor 😞</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Sleep Quality */}
                    <Grid item xs={12} md={6}>
                        <Box mb={2}>
                            <Typography gutterBottom>
                                <Bedtime /> Sleep Quality
                            </Typography>
                            <Slider
                                value={energyData.sleep_quality}
                                onChange={handleSliderChange('sleep_quality')}
                                min={1}
                                max={5}
                                step={1}
                                marks
                                sx={{
                                    color: getSliderColor(energyData.sleep_quality || 3),
                                }}
                            />
                        </Box>
                    </Grid>

                    {/* Stress Level */}
                    <Grid item xs={12} md={6}>
                        <Box mb={2}>
                            <Typography gutterBottom>
                                Stress Level
                            </Typography>
                            <Slider
                                value={energyData.stress_level}
                                onChange={handleSliderChange('stress_level')}
                                min={1}
                                max={5}
                                step={1}
                                marks
                                sx={{
                                    color: getSliderColor(6 - (energyData.stress_level || 3)),
                                }}
                            />
                        </Box>
                    </Grid>

                    {/* Medication */}
                    <Grid item xs={12} md={6}>
                        <Box display="flex" alignItems="center">
                            <Typography>Medication Taken</Typography>
                            <Switch
                                checked={energyData.medication_taken}
                                onChange={handleMedicationChange}
                                color="primary"
                            />
                        </Box>
                    </Grid>

                    {/* Notes */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Notes"
                            value={energyData.notes}
                            onChange={handleNotesChange}
                            variant="outlined"
                        />
                    </Grid>

                    {/* Submit Button */}
                    <Grid item xs={12}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={loading}
                            sx={{ mt: 2 }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Record Energy Levels'
                            )}
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};
