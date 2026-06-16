import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({
  label,
  error,
  helperText,
  className,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        className={clsx(
          'w-full bg-gray-900/50 border rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200',
          {
            'border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/20': !error,
            'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': error,
          },
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}
