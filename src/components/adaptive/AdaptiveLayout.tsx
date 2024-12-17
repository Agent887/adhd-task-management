import React, { useEffect, useState } from 'react';
import { AdaptiveInterface } from '../../utils/adaptiveInterface';
import { useUserMetrics } from '../../hooks/useUserMetrics';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
  context?: string;
}

export const AdaptiveLayout: React.FC<AdaptiveLayoutProps> = ({
  children,
  context = 'default'
}) => {
  const { metrics } = useUserMetrics();
  const [layout, setLayout] = useState(AdaptiveInterface.getOptimizedLayout(metrics, context));

  useEffect(() => {
    // Update layout when metrics or context changes
    setLayout(AdaptiveInterface.getOptimizedLayout(metrics, context));
  }, [metrics, context]);

  const getLayoutClass = () => {
    const { state } = layout;
    return [
      `complexity-${state.complexity}`,
      `layout-${state.layout}`,
      `color-scheme-${state.colorScheme}`,
      `animations-${state.animations}`,
      `density-${state.density}`
    ].join(' ');
  };

  const renderElements = () => {
    return layout.elements.map(element => (
      <div
        key={element.id}
        className={`adaptive-element ${element.type}`}
        style={{
          order: element.position.order,
          gridArea: element.position.section
        }}
        onClick={() => AdaptiveInterface.trackElementUsage(element.id, context, true)}
      >
        {children}
      </div>
    ));
  };

  return (
    <div className={`adaptive-layout ${getLayoutClass()}`}>
      {renderElements()}
    </div>
  );
};
