import * as React from 'react';
import { Task } from './types/task';

interface UserInterfaceProps {
  tasks: Task[];
}

const UserInterface: React.FC<UserInterfaceProps> = ({ tasks }) => {
  return (
    <div>
      <h1>Task Management System</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserInterface;
