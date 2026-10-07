import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-transparent border-indigo-600 ${sizeClasses[size]}`}
        role="status"
        aria-label={message}
      />
      {message && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
};

