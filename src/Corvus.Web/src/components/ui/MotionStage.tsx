import React from 'react';

export interface PageStageProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Top-level container for staggered page/view choreography.
 * Applies standard max-width, flex column, and gap spacing.
 */
export const PageStage: React.FC<PageStageProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div className={`page-inner ${className}`} style={style}>
      {children}
    </div>
  );
};

export interface MotionItemProps {
  children: React.ReactNode;
  staggerIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  onClick?: React.MouseEventHandler;
}

/**
 * Motion item component that animates into view with a 42ms * staggerIndex delay
 * using ObsidianUI cubic-bezier(0.22, 1, 0.36, 1) spring physics.
 */
export const MotionItem: React.FC<MotionItemProps> = ({
  children,
  staggerIndex = 0,
  className = '',
  style = {},
  as: Component = 'div',
  onClick,
  ...rest
}) => {
  const motionStyle = {
    ...style,
    ['--stagger' as string]: staggerIndex,
  };

  return (
    <Component
      className={`motion-item ${className}`}
      style={motionStyle}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Component>
  );
};
