import React from 'react';
import { Grid, Typography } from '@mui/material';
import { MetricCard } from '../analytics/MetricCard';
import PerformanceChart from '../analytics/PerformanceChart';

const Dashboard: React.FC = () => {
  // Sample data - replace with real data from your backend
  const performanceData = [
    { date: '2024-01-01', value: 75, target: 80 },
    { date: '2024-01-02', value: 82, target: 80 },
    { date: '2024-01-03', value: 78, target: 80 },
    { date: '2024-01-04', value: 85, target: 80 },
    { date: '2024-01-05', value: 90, target: 80 },
  ];

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Welcome to Done365
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Tasks Completed"
            value="12"
            trend="up"
            color="success"
            percentage="15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Energy Level"
            value="85%"
            trend="up"
            color="info"
            percentage="5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Focus Time"
            value="4h 30m"
            trend="down"
            color="warning"
            percentage="10%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Productivity Score"
            value="88"
            trend="up"
            color="success"
            percentage="8%"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <PerformanceChart
            title="Weekly Performance"
            data={performanceData}
            dataKey="value"
            targetKey="target"
            yAxisLabel="Performance Score"
          />
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;
