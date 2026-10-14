import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-900 shadow-sm border border-transparent',
  secondary:
    'bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400 focus-visible:ring-slate-400 border border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm border border-transparent',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-400 border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5 h-8',
  md: 'text-sm px-4 py-2 rounded-lg gap-2 h-10',
  lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5 h-12',
};

const spinnerSizes: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...rest}
      >
        {isLoading && (
          <Loader2
            className={clsx('animate-spin shrink-0', spinnerSizes[size])}
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
