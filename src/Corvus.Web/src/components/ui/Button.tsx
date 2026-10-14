import React from 'react';

export type ButtonVariant =
  | 'default'
  | 'cloud'
  | 'ghost'
  | 'danger'
  | 'primary'
  | 'secondary'
  | 'icon';

export type ButtonSize = 'default' | 'md' | 'sm' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
}

/**
 * ObsidianUI Tactile Button with micro-press scale(0.96) physics,
 * cloud white accent styling, and inline spinner loading morph.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Normalize legacy variants
  const resolvedVariant: 'default' | 'cloud' | 'ghost' | 'danger' | 'icon' =
    variant === 'primary'
      ? 'cloud'
      : variant === 'secondary'
      ? 'default'
      : variant;

  const isIconOnly = size === 'icon' || resolvedVariant === 'icon';

  const variantClass = {
    default: 'btn',
    cloud: 'btn btn-cloud',
    ghost: 'btn btn-ghost',
    danger: 'btn btn-danger',
    icon: 'btn btn-ghost !p-1.5',
  }[resolvedVariant];

  const sizeClass =
    isIconOnly
      ? 'w-7 h-7 !p-0'
      : size === 'sm'
      ? 'btn-sm'
      : '';

  return (
    <button
      className={`${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        <>
          {icon && (
            <span className="shrink-0 flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5">
              {icon}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
};
