import React, { forwardRef } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  info: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', dot = false, className, children, ...rest }, ref) => {
    const config = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors',
          config.badge,
          className
        )}
        {...rest}
      >
        {dot && (
          <span
            className={clsx('w-1.5 h-1.5 rounded-full shrink-0', config.dot)}
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
