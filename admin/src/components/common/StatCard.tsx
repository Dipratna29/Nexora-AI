import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  onClick?: () => void;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900/30',
  },
  emerald: {
    bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/30',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/30',
  },
  rose: {
    bg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    border: 'border-rose-100 dark:border-rose-900/30',
  },
  purple: {
    bg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-900/30',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  trend,
  onClick,
}) => {
  const styles = colorMap[variant];

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-brand-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${styles.bg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs">
          <span
            className={`font-bold mr-1.5 ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            {trend.label || 'vs last week'}
          </span>
        </div>
      )}
    </div>
  );
};
