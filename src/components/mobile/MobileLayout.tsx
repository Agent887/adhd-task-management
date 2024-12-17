import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { useUserMetrics } from '../../hooks/useUserMetrics';

interface MobileLayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
  bottomBar?: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  navigation,
  bottomBar
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { metrics } = useUserMetrics();

  const swipeHandlers = useSwipeable({
    onSwipedRight: () => setMenuOpen(true),
    onSwipedLeft: () => setMenuOpen(false),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  const getLayoutStyle = () => {
    // Adapt layout based on user metrics
    return {
      fontSize: metrics.focusLevel < 50 ? '16px' : '14px',
      lineHeight: metrics.focusLevel < 50 ? '1.6' : '1.4',
      padding: metrics.energyLevel < 50 ? '1.5rem' : '1rem',
    };
  };

  return (
    <div className="mobile-layout" {...swipeHandlers}>
      <header className="mobile-header">
        <button 
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <h1 className="app-title">Task Manager</h1>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-nav"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {navigation}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mobile-content" style={getLayoutStyle()}>
        {children}
      </main>

      {bottomBar && (
        <footer className="mobile-bottom-bar">
          {bottomBar}
        </footer>
      )}
    </div>
  );
};
