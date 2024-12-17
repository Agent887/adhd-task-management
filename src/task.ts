export class Task {
  title: string;
  description: string;
  dueDate: Date;

  constructor(title: string, description: string, dueDate: Date) {
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
  }

  breakDownTask(): void {
    // Implement task breakdown logic here
    const subTasks: SubTask[] = [];
    // Recursive function to break down tasks
    function breakDown(task: Task): void {
      if (task.description.length > 100) {
        const subTask1 = new SubTask(task.title + ' - Part 1', task.description.substring(0, 100), task.dueDate);
        const subTask2 = new SubTask(task.title + ' - Part 2', task.description.substring(100), task.dueDate);
        subTasks.push(subTask1);
        subTasks.push(subTask2);
        breakDown(subTask1);
        breakDown(subTask2);
      }
    }
    breakDown(this);
    console.log(subTasks);
  }
}

export class SubTask extends Task {
  constructor(title: string, description: string, dueDate: Date) {
    super(title, description, dueDate);
  }
}
