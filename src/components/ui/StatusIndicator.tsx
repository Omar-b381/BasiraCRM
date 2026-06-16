import React from 'react';
import { clsx } from 'clsx';

interface StatusIndicatorProps {
  status: 'idle' | 'testing' | 'success' | 'failed';
  text?: string;
  size?: 'sm' | 'md';
}

export default function StatusIndicator({
  status,
  text,
  size = 'md'
}: StatusIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={clsx(
        'rounded-full shrink-0',
        {
          'w-2 h-2': size === 'sm',
          'w-3 h-3': size === 'md',
        },
        {
          'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.5)]': status === 'idle',
          'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)] animate-pulse': status === 'testing',
          'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]': status === 'success',
          'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]': status === 'failed',
        }
      )} />
      {text && (
        <span className={clsx('font-medium text-xs', {
          'text-gray-400': status === 'idle',
          'text-blue-400': status === 'testing',
          'text-emerald-400': status === 'success',
          'text-red-400': status === 'failed',
        })}>
          {text}
        </span>
      )}
    </div>
  );
}
