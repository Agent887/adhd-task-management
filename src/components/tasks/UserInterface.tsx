import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Task } from '../../types/task';

interface UserInterfaceProps {
  tasks: Task[];
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
}

const UserInterface: React.FC<UserInterfaceProps> = ({ 
  tasks,
  onDeleteTask,
  onEditTask,
}) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Your Tasks
      </Typography>
      <List>
        {tasks.map((task) => (
          <Paper key={task.id} elevation={1} sx={{ mb: 2 }}>
            <ListItem>
              <ListItemText
                primary={task.title}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={task.priority} 
                        size="small" 
                        color={
                          task.priority === 'high' ? 'error' :
                          task.priority === 'medium' ? 'warning' : 'success'
                        }
                        sx={{ mr: 1 }}
                      />
                      {task.tags?.map((tag) => (
                        <Chip 
                          key={tag} 
                          label={tag} 
                          size="small" 
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                {onEditTask && (
                  <IconButton 
                    edge="end" 
                    aria-label="edit"
                    onClick={() => onEditTask(task.id)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                )}
                {onDeleteTask && (
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>
    </Box>
  );
};

export default UserInterface;
