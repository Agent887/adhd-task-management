import React from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Task } from '../../types/task';
import { useUserMetrics } from '../../hooks/useUserMetrics';

interface MobileTaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export const MobileTaskCard: React.FC<MobileTaskCardProps> = ({
  task,
  onComplete,
  onEdit,
  onDelete
}) => {
  const { metrics } = useUserMetrics();
  const [isActionsVisible, setActionsVisible] = React.useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => setActionsVisible(true),
    onSwipedRight: () => {
      if (isActionsVisible) {
        setActionsVisible(false);
      } else {
        onComplete(task.id);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  const getCardStyle = () => {
    const baseStyle = {
      padding: '1rem',
      margin: '0.5rem 0',
      borderRadius: '8px',
      background: '#ffffff',
    };

    if (metrics.focusLevel < 30) {
      return {
        ...baseStyle,
        padding: '0.75rem',
        background: task.priority > 70 ? '#fff3f3' : '#ffffff',
      };
    }

    return baseStyle;
  };

  return (
    <motion.div
      className="mobile-task-card"
      style={getCardStyle()}
      {...handlers}
      animate={{
        x: isActionsVisible ? -100 : 0,
      }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className="task-content">
        <h3 className="task-title">{task.title}</h3>
        {metrics.focusLevel > 30 && (
          <p className="task-description">{task.description}</p>
        )}
        <div className="task-metadata">
          <span className="priority">Priority: {task.priority}</span>
          <span className="due-date">
            {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      <motion.div 
        className="task-actions"
        animate={{ opacity: isActionsVisible ? 1 : 0 }}
      >
        <button onClick={() => onEdit(task.id)}>Edit</button>
        <button onClick={() => onDelete(task.id)}>Delete</button>
        <button onClick={() => setActionsVisible(false)}>Cancel</button>
      </motion.div>

      <div className="swipe-hints">
        <span>← Swipe left for actions</span>
        <span>Swipe right to complete →</span>
      </div>
    </motion.div>
  );
};
