import React from 'react';
import { useTasksStore } from '../../store/useTasksStore';

interface TasksBadgeProps {
  className?: string;
}

export default function TasksBadge({ className }: TasksBadgeProps) {
  const { tasks } = useTasksStore();

  const overdueCount = React.useMemo(() => {
    const now = new Date();
    return tasks.filter(
      (t) => t.status === 'معلقة' && t.due_date && new Date(t.due_date) < now
    ).length;
  }, [tasks]);

  if (overdueCount === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-[9px] font-bold px-1.5 animate-pulse ${className}`}
      style={{
        background: '#EF4444',
        boxShadow: '0 0 8px rgba(239, 68, 68, 0.60)',
        color: '#FFFFFF',
      }}
    >
      {overdueCount}
    </span>
  );
}
