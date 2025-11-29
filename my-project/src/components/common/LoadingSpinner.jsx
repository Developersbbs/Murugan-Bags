import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = '', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  const gradientClasses = {
    blue: 'from-blue-500 to-purple-500',
    gray: 'from-gray-400 to-gray-600',
    white: 'from-white to-gray-100',
    red: 'from-red-500 to-pink-500',
    green: 'from-green-500 to-emerald-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div 
          className={`animate-spin rounded-full border-4 border-transparent bg-gradient-to-r ${gradientClasses[color]} ${sizeClasses[size]}`}
          style={{
            background: `conic-gradient(from 0deg, transparent, transparent, var(--tw-gradient-stops))`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))'
          }}
        />
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`rounded-full bg-gradient-to-r ${gradientClasses[color]} animate-pulse`}
            style={{ width: '25%', height: '25%' }}
          />
        </div>
      </div>
      
      {text && (
        <div className="mt-6 text-center">
          <p className="text-lg font-medium text-gray-700 mb-2">{text}</p>
          <div className="flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
