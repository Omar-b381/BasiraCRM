import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red' | 'gray';
  className?: string;
}

export default function Badge({
  children,
  variant = 'gray',
  className
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        {
          'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20': variant === 'emerald',
          'bg-blue-950/40 text-blue-400 border border-blue-500/20': variant === 'blue',
          'bg-purple-950/40 text-purple-400 border border-purple-500/20': variant === 'purple',
          'bg-amber-950/40 text-amber-400 border border-amber-500/20': variant === 'amber',
          'bg-red-950/40 text-red-400 border border-red-500/20': variant === 'red',
          'bg-gray-900 text-gray-400 border border-gray-800': variant === 'gray',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
