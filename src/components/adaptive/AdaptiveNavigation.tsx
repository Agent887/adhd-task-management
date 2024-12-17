import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUserMetrics } from '../../hooks/useUserMetrics';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  priority: number;
}

interface AdaptiveNavigationProps {
  items: NavigationItem[];
  onSelect: (id: string) => void;
  context?: string;
}

export const AdaptiveNavigation: React.FC<AdaptiveNavigationProps> = ({
  items,
  onSelect,
  context = 'default'
}) => {
  const { metrics } = useUserMetrics();
  const [visibleItems, setVisibleItems] = useState(items);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // Adapt navigation based on focus and energy levels
    const shouldCollapse = metrics.focusLevel < 30;
    setExpanded(!shouldCollapse);

    // Filter items based on priority when focus is low
    if (metrics.focusLevel < 50) {
      const highPriorityItems = items.filter(item => item.priority >= 70);
      setVisibleItems(highPriorityItems);
    } else {
      setVisibleItems(items);
    }
  }, [metrics, items]);

  const getNavigationStyle = () => {
    return {
      width: expanded ? '240px' : '64px',
      transition: 'width 0.3s ease'
    };
  };

  const getItemStyle = (priority: number) => {
    const opacity = metrics.focusLevel < 50 ? 0.7 + (priority / 100) * 0.3 : 1;
    return {
      opacity,
      padding: metrics.energyLevel < 50 ? '1rem' : '0.75rem',
      fontSize: metrics.focusLevel < 30 ? '0.9rem' : '1rem'
    };
  };

  return (
    <motion.nav
      className="adaptive-navigation"
      style={getNavigationStyle()}
      initial={false}
      animate={{ width: expanded ? 240 : 64 }}
    >
      <div className="navigation-header">
        <button
          className="toggle-button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '←' : '→'}
        </button>
      </div>

      <div className="navigation-items">
        {visibleItems.map(item => (
          <motion.div
            key={item.id}
            className="navigation-item"
            style={getItemStyle(item.priority)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(item.id)}
          >
            <span className="icon">{item.icon}</span>
            {expanded && (
              <motion.span
                className="label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {item.label}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {metrics.energyLevel < 30 && (
        <div className="energy-warning">
          Low energy mode active
        </div>
      )}
    </motion.nav>
  );
};
