import TaskManagementSystem from './task_management_system';

describe('TaskManagementSystem', () => {
  it('should create a new task', () => {
    const taskManagementSystem = new TaskManagementSystem();
    const task = taskManagementSystem.createTask('New Task');
    expect(task).toBeDefined();
  });

  it('should edit a task', () => {
    const taskManagementSystem = new TaskManagementSystem();
    const task = taskManagementSystem.createTask('New Task');
    taskManagementSystem.editTask(0, 'Updated Task');
    expect(taskManagementSystem.getTasks()[0].name).toBe('Updated Task');
  });

  it('should delete a task', () => {
    const taskManagementSystem = new TaskManagementSystem();
    const task = taskManagementSystem.createTask('New Task');
    taskManagementSystem.deleteTask(0);
    expect(taskManagementSystem.getTasks().length).toBe(0);
  });

  it('should handle errors', () => {
    const taskManagementSystem = new TaskManagementSystem();
    expect(() => taskManagementSystem.createTask(null)).toThrowError();
  });
});
