import { useUserMetrics } from '../hooks/useUserMetrics';

export type AnimationPreset = 'fade' | 'slide' | 'scale' | 'bounce' | 'none';

interface AnimationConfig {
  duration: number;
  ease: string;
  delay?: number;
}

export const useAnimations = () => {
  const { metrics } = useUserMetrics();

  const getAnimationConfig = (preset: AnimationPreset): AnimationConfig => {
    // Adjust animation parameters based on focus and energy levels
    const baseDuration = metrics.focusLevel < 50 ? 0.4 : 0.3;
    const baseEase = metrics.energyLevel < 50 ? 'easeOut' : 'easeInOut';

    switch (preset) {
      case 'fade':
        return {
          duration: baseDuration,
          ease: baseEase,
        };
      case 'slide':
        return {
          duration: baseDuration * 1.2,
          ease: 'spring',
        };
      case 'scale':
        return {
          duration: baseDuration * 0.8,
          ease: baseEase,
        };
      case 'bounce':
        return {
          duration: baseDuration * 1.5,
          ease: 'backOut',
        };
      case 'none':
        return {
          duration: 0,
          ease: 'linear',
        };
      default:
        return {
          duration: baseDuration,
          ease: baseEase,
        };
    }
  };

  const getTransition = (preset: AnimationPreset) => {
    const config = getAnimationConfig(preset);
    return {
      type: 'tween',
      ...config,
    };
  };

  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slide: {
      initial: { x: -20, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 20, opacity: 0 },
    },
    scale: {
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.9, opacity: 0 },
    },
    bounce: {
      initial: { y: -20, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 20, opacity: 0 },
    },
    none: {
      initial: {},
      animate: {},
      exit: {},
    },
  };

  const shouldReduceMotion = () => {
    return metrics.focusLevel < 30 || metrics.energyLevel < 30;
  };

  return {
    getTransition,
    variants,
    shouldReduceMotion,
  };
};
