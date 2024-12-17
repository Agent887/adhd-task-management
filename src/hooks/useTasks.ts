import { useState, useEffect } from 'react';
import { Task, SubTask } from '../types/task';
import { apiService } from '../utils/api';
import { useSnackbar } from 'notistack';
import { PriorityManager } from '../utils/priorityManager';
import { DecisionSupport, Option, Consequence, Recommendation } from '../utils/decisionSupport';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentContext, setCurrentContext] = useState({ energy: 50, focus: 50 });
  const [taskOptions, setTaskOptions] = useState<Record<string, Option[]>>({});
  const [taskConsequences, setTaskConsequences] = useState<Record<string, Consequence[]>>({});
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation>>({});
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    // Update priorities when context changes
    updateTaskPriorities();
  }, [currentContext, tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTasks();
      const tasksWithPriority = response.data.map(task => calculateTaskPriority(task, response.data));
      setTasks(tasksWithPriority);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      enqueueSnackbar('Error fetching tasks', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTaskPriority = (task: Task, allTasks: Task[]): Task => {
    const priorityFactors = PriorityManager.calculatePriorityFactors(task, allTasks);
    const urgencyMetrics = PriorityManager.calculateUrgencyMetrics(task, priorityFactors, currentContext);
    const priorityScore = PriorityManager.calculatePriorityScore(priorityFactors, urgencyMetrics);

    return {
      ...task,
      priorityFactors,
      urgencyMetrics,
      priorityScore,
      lastPriorityUpdate: new Date().toISOString(),
      contextChanges: (task.contextChanges || 0) + 1
    };
  };

  const updateTaskPriorities = () => {
    const updatedTasks = tasks.map(task => {
      if (!task.lastPriorityUpdate) return calculateTaskPriority(task, tasks);

      const lastUpdate = new Date(task.lastPriorityUpdate);
      const adjustedScore = PriorityManager.adjustPriority(
        task.priorityScore || 0.5,
        lastUpdate,
        task.contextChanges || 0
      );

      if (Math.abs((task.priorityScore || 0) - adjustedScore) > 0.1) {
        return calculateTaskPriority(task, tasks);
      }

      return task;
    });

    setTasks(updatedTasks);
  };

  const updateContext = (newContext: typeof currentContext) => {
    setCurrentContext(newContext);
  };

  const createTask = async (taskDetails: { 
    title: string; 
    dueDate?: string; 
    priority?: Task['priority']; 
  }) => {
    const newTask: Omit<Task, 'id'> = {
      title: taskDetails.title,
      description: '',
      completed: false,
      subtasks: [],
      priority: taskDetails.priority || 'medium',
      dueDate: taskDetails.dueDate || new Date().toISOString(),
      completionPercentage: 0,
      tags: [],
    };

    await addTask(newTask);
  };

  const completeTask = async (taskName: string) => {
    const task = tasks.find(t => t.title.toLowerCase() === taskName.toLowerCase());
    if (!task) {
      enqueueSnackbar(`Task "${taskName}" not found`, { variant: 'error' });
      return;
    }

    await updateTask(task.id, { 
      completed: true,
      completionPercentage: 100,
    });
  };

  const addTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      const response = await apiService.createTask(newTask);
      setTasks([...tasks, response.data]);
      enqueueSnackbar('Task added successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error adding task:', error);
      enqueueSnackbar('Error adding task', { variant: 'error' });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await apiService.updateTask(taskId, updates);
      setTasks(tasks.map(task => task.id === taskId ? response.data : task));
      enqueueSnackbar('Task updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error updating task:', error);
      enqueueSnackbar('Error updating task', { variant: 'error' });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      enqueueSnackbar('Task deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting task:', error);
      enqueueSnackbar('Error deleting task', { variant: 'error' });
    }
  };

  const addSubtask = async (taskId: string, subtask: SubTask) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = {
        ...task,
        subtasks: [...task.subtasks, subtask],
      };

      await updateTask(taskId, updatedTask);
    } catch (error) {
      console.error('Error adding subtask:', error);
      enqueueSnackbar('Error adding subtask', { variant: 'error' });
    }
  };

  const updateSubtask = async (taskId: string, subtaskId: string, updates: Partial<SubTask>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedSubtasks = task.subtasks.map(subtask =>
        subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
      );

      await updateTask(taskId, { subtasks: updatedSubtasks });
    } catch (error) {
      console.error('Error updating subtask:', error);
      enqueueSnackbar('Error updating subtask', { variant: 'error' });
    }
  };

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
      await updateTask(taskId, { subtasks: updatedSubtasks });
    } catch (error) {
      console.error('Error deleting subtask:', error);
      enqueueSnackbar('Error deleting subtask', { variant: 'error' });
    }
  };

  const analyzeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Generate options
    const options = DecisionSupport.analyzeOptions(task, tasks);
    setTaskOptions(prev => ({ ...prev, [taskId]: options }));

    // Predict consequences for each option
    const consequences = options.flatMap(option => 
      DecisionSupport.predictConsequences(task, option, tasks)
    );
    setTaskConsequences(prev => ({ ...prev, [taskId]: consequences }));

    // Generate recommendation
    const recommendation = DecisionSupport.generateRecommendation(
      task,
      options,
      consequences,
      currentContext
    );
    setRecommendations(prev => ({ ...prev, [taskId]: recommendation }));
  };

  const getTaskAnalysis = (taskId: string) => {
    if (!taskOptions[taskId]) {
      analyzeTask(taskId);
    }

    return {
      options: taskOptions[taskId] || [],
      consequences: taskConsequences[taskId] || [],
      recommendation: recommendations[taskId]
    };
  };

  return {
    tasks,
    loading,
    currentContext,
    updateContext,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    analyzeTask,
    getTaskAnalysis
  };
};
