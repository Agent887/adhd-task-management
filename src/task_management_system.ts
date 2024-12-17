class TaskManagementSystem {
  private tasks: any[];

  constructor() {
    this.tasks = [];
  }

  createTask(name: string | null | undefined) {
    if (name === null || name === undefined) {
      throw new Error('Task name cannot be null or undefined');
    }
    const task = { id: this.tasks.length, name };
    this.tasks.push(task);
    return task;
  }

  editTask(id: number, name: string) {
    const task = this.tasks.find((task) => task.id === id);
    if (task) {
      task.name = name;
    }
  }

  deleteTask(id: number) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }

  getTasks() {
    return this.tasks;
  }
}

export default TaskManagementSystem;
