import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'default' | 'sm' | 'icon';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'default',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-[transform,background-color,border-color,color,opacity] duration-200 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#d5d5dc] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.93]';

  const sizeClasses =
    size === 'icon' || variant === 'icon'
      ? 'w-9 h-9 p-0 rounded-full'
      : size === 'sm'
      ? 'h-8 px-3.5 text-xs rounded-full gap-1.5'
      : 'h-[38px] px-3.5 text-[13px] rounded-full gap-2';

  const variantClasses = {
    primary:
      'bg-[#d5d5dc] text-[#1b1d2a] border border-transparent hover:bg-white hover:shadow-sm shadow-xs font-semibold',
    secondary:
      'bg-white/[0.08] text-[#eceef6] border border-white/10 hover:bg-white/[0.14] hover:border-white/15',
    danger:
      'bg-rose-500/10 text-[#f87171] border border-rose-500/35 hover:bg-rose-500/20 hover:border-rose-500/50',
    icon:
      'bg-white/[0.08] text-[#eceef6] border border-white/10 hover:bg-white/[0.14] hover:text-white',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      {children}
    </button>
  );
};
