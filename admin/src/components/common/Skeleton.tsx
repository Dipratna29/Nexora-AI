import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'h-4 w-full',
  variant = 'rectangular',
}) => {
  const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'text' ? 'rounded' : 'rounded-xl';

  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800/80 ${variantClass} ${className}`}
    />
  );
};
