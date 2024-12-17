import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Task, SubTask } from '../../types/task';
import { useSnackbar } from 'notistack';
import { useTasks } from '../../hooks/useTasks';
import UserInterface from './UserInterface';

const TaskBreakdownView: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, addSubtask, updateSubtask, deleteSubtask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask({
        title: newTaskTitle,
        completed: false,
        subtasks: [],
        priority: 'medium',
        dueDate: new Date().toISOString(),
      });
      setNewTaskTitle('');
      enqueueSnackbar('Task added successfully', { variant: 'success' });
    }
  };

  const handleAddSubtask = (taskId: string) => {
    const subtask: SubTask = {
      title: 'New subtask',
      completed: false,
    };
    addSubtask(taskId, subtask);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Task Breakdown
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            variant="outlined"
            label="New Task"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddTask}
            sx={{ height: '56px' }}
          >
            Add Task
          </Button>
        </Grid>
      </Grid>

      <UserInterface
        tasks={tasks}
        onDeleteTask={deleteTask}
        onEditTask={(taskId) => {
          // TODO: Implement edit task functionality
          console.log('Edit task:', taskId);
        }}
      />
    </Box>
  );
};

export default TaskBreakdownView;
