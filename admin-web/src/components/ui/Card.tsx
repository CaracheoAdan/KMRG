import React, { forwardRef } from 'react';
import clsx from 'clsx';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  children?: React.ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-white rounded-xl shadow-sm border border-slate-200 text-slate-900 overflow-hidden',
          paddingStyles[padding],
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('flex flex-col space-y-1.5 pb-4', className)}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <h3
        ref={ref}
        className={clsx(
          'text-lg font-semibold leading-tight tracking-tight text-slate-900',
          className
        )}
        {...rest}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <p
        ref={ref}
        className={clsx('text-sm text-slate-500', className)}
        {...rest}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div ref={ref} className={clsx('pt-0', className)} {...rest}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('flex items-center pt-4 border-t border-slate-100', className)}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
