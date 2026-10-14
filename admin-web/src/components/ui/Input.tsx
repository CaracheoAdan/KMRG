import React, { forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, disabled, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(error);

    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'block text-sm font-medium text-slate-700 select-none',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          className={clsx(
            'w-full px-3.5 py-2 text-sm rounded-lg transition-colors duration-150',
            'bg-white text-slate-900 placeholder:text-slate-400',
            'border shadow-sm outline-none',
            'focus:ring-2 focus:ring-offset-0',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed',
            hasError
              ? 'border-red-500 text-red-900 focus:border-red-500 focus:ring-red-200/60'
              : 'border-slate-300 focus:border-slate-500 focus:ring-slate-400/25',
            className
          )}
          {...rest}
        />

        {hasError ? (
          <p id={errorId} className="text-xs text-red-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
