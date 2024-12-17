import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import Navigation from './components/common/Navigation';
import Dashboard from './components/dashboard/Dashboard';
import TaskBreakdownView from './components/tasks/TaskBreakdownView';
import { EnergyTracker } from './components/energy/EnergyTracker';
import { EnergyAnalysis } from './components/energy/EnergyAnalysis';
import { CollaborationDashboard } from './components/collaboration/CollaborationDashboard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <Router>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Container maxWidth="lg">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tasks" element={<TaskBreakdownView />} />
                    <Route path="/energy" element={<EnergyTracker />} />
                    <Route path="/energy/analysis" element={<EnergyAnalysis />} />
                    <Route path="/collaboration" element={<CollaborationDashboard />} />
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                  </Routes>
                </Container>
              </Box>
            </Box>
          </Router>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
