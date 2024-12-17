import React from 'react';
import { motion } from 'framer-motion';
import { useUserMetrics } from '../../hooks/useUserMetrics';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  priority: number;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeItem: string;
  onSelect: (id: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items,
  activeItem,
  onSelect
}) => {
  const { metrics } = useUserMetrics();

  const getNavStyle = () => {
    // Adapt navigation style based on user metrics
    return {
      height: metrics.energyLevel < 50 ? '70px' : '60px',
      padding: metrics.focusLevel < 50 ? '0.75rem' : '0.5rem',
    };
  };

  const getItemStyle = (priority: number) => {
    const baseSize = metrics.focusLevel < 50 ? '1.2' : '1';
    const scale = 1 + (priority / 100) * 0.2;
    
    return {
      fontSize: `${baseSize}rem`,
      transform: `scale(${scale})`,
    };
  };

  return (
    <motion.nav 
      className="mobile-bottom-nav"
      style={getNavStyle()}
      initial={false}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
    >
      {items.map(item => (
        <motion.button
          key={item.id}
          className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
          style={getItemStyle(item.priority)}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(item.id)}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
          {item.priority > 70 && metrics.focusLevel < 50 && (
            <motion.span 
              className="priority-indicator"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </motion.button>
      ))}
    </motion.nav>
  );
};
