import { useUserMetrics } from '../hooks/useUserMetrics';

interface InteractionConfig {
  hapticFeedback: boolean;
  soundFeedback: boolean;
  visualFeedback: boolean;
  tooltips: boolean;
}

export const useInteractionManager = () => {
  const { metrics } = useUserMetrics();

  const getInteractionConfig = (): InteractionConfig => {
    const baseConfig = {
      hapticFeedback: true,
      soundFeedback: true,
      visualFeedback: true,
      tooltips: true,
    };

    // Adjust based on focus level
    if (metrics.focusLevel < 30) {
      return {
        ...baseConfig,
        soundFeedback: false, // Reduce distractions
        visualFeedback: true, // Keep visual feedback for clarity
        tooltips: true, // Keep tooltips for guidance
      };
    }

    // Adjust based on energy level
    if (metrics.energyLevel < 30) {
      return {
        ...baseConfig,
        hapticFeedback: false, // Reduce physical feedback
        visualFeedback: true, // Keep visual feedback
        tooltips: false, // Reduce visual noise
      };
    }

    return baseConfig;
  };

  const getFeedbackStyle = (elementType: string) => {
    const config = getInteractionConfig();
    const baseStyle = {};

    if (config.visualFeedback) {
      switch (elementType) {
        case 'button':
          return {
            ...baseStyle,
            transition: 'transform 0.1s ease',
            ':active': {
              transform: 'scale(0.98)',
            },
          };
        case 'input':
          return {
            ...baseStyle,
            transition: 'border-color 0.2s ease',
            ':focus': {
              borderColor: '#007aff',
              boxShadow: '0 0 0 2px rgba(0,122,255,0.2)',
            },
          };
        default:
          return baseStyle;
      }
    }

    return baseStyle;
  };

  const getTooltipConfig = (importance: 'low' | 'medium' | 'high') => {
    const config = getInteractionConfig();

    if (!config.tooltips) {
      return { show: false };
    }

    return {
      show: true,
      delay: metrics.focusLevel < 50 ? 1000 : 500,
      duration: metrics.focusLevel < 50 ? 4000 : 3000,
      style: {
        fontSize: metrics.focusLevel < 50 ? '1rem' : '0.875rem',
        padding: metrics.focusLevel < 50 ? '0.75rem' : '0.5rem',
        opacity: importance === 'high' ? 1 : 0.9,
      },
    };
  };

  const handleInteraction = (type: string, data?: any) => {
    const config = getInteractionConfig();

    // Visual feedback
    if (config.visualFeedback) {
      // Implement visual feedback based on interaction type
      switch (type) {
        case 'success':
          // Show success animation
          break;
        case 'error':
          // Show error animation
          break;
        case 'warning':
          // Show warning animation
          break;
      }
    }

    // Haptic feedback
    if (config.hapticFeedback && window.navigator.vibrate) {
      switch (type) {
        case 'success':
          window.navigator.vibrate(50);
          break;
        case 'error':
          window.navigator.vibrate([100, 50, 100]);
          break;
        case 'warning':
          window.navigator.vibrate([50, 30, 50]);
          break;
      }
    }

    // Sound feedback
    if (config.soundFeedback) {
      // Implement sound feedback based on interaction type
      // Note: This should be implemented with actual sound files
      // and respect user preferences
    }
  };

  return {
    getInteractionConfig,
    getFeedbackStyle,
    getTooltipConfig,
    handleInteraction,
  };
};
