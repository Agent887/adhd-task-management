import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserMetrics } from '../../hooks/useUserMetrics';

interface AdaptiveCardProps {
  id: string;
  title: string;
  content: React.ReactNode;
  importance?: 'low' | 'medium' | 'high';
  context?: string;
}

export const AdaptiveCard: React.FC<AdaptiveCardProps> = ({
  id,
  title,
  content,
  importance = 'medium',
  context = 'default'
}) => {
  const { metrics } = useUserMetrics();
  const focusLevel = metrics.focusLevel || 50;

  const getCardStyle = () => {
    // Adapt card style based on focus level and importance
    if (focusLevel < 30) {
      return {
        padding: '1rem',
        background: importance === 'high' ? '#fff3f3' : '#ffffff',
        border: importance === 'high' ? '2px solid #ff4444' : '1px solid #e0e0e0'
      };
    }

    return {
      padding: '1.5rem',
      background: '#ffffff',
      boxShadow: importance === 'high' 
        ? '0 4px 12px rgba(255, 68, 68, 0.1)'
        : '0 2px 8px rgba(0, 0, 0, 0.05)'
    };
  };

  const getAnimationProps = () => {
    // Adapt animations based on focus level
    if (focusLevel < 30) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3 }
      };
    }

    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    };
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`adaptive-card importance-${importance}`}
        style={getCardStyle()}
        {...getAnimationProps()}
      >
        <h3 className="adaptive-card-title">
          {title}
        </h3>
        <div className="adaptive-card-content">
          {content}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
