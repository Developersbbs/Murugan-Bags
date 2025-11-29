import React from 'react';

const LoadingSpinner = ({ size = 'medium', variant = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} ${className} animate-pulse-glow`}>
            <div className="animate-pulse rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 h-full w-full animate-gradient-shift"></div>
          </div>
        );

      case 'bounce':
        return (
          <div className={`flex space-x-2 ${className}`}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-float`}
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        );

      case 'wave':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full animate-pulse"
                style={{
                  height: `${20 + i * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s'
                }}
              ></div>
            ))}
          </div>
        );

      case 'ring':
        return (
          <div className={`${sizeClasses[size]} relative ${className}`}>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 border-4 border-transparent border-b-pink-500 border-l-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full opacity-50 animate-pulse"></div>
          </div>
        );

      case 'dots':
        return (
          <div className={`flex space-x-3 ${className}`}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        );

      case 'shimmer':
        return (
          <div className={`${sizeClasses[size]} ${className} relative overflow-hidden rounded-full bg-gradient-to-r from-gray-200 to-gray-300`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
          </div>
        );

      default: // classic spinner with glow
        return (
          <div className={`${sizeClasses[size]} ${className} animate-pulse-glow`}>
            <div className="border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin"></div>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center">
      {renderSpinner()}
    </div>
  );
};

const LoadingScreen = ({
  variant = 'ring',
  message = 'Loading...',
  fullScreen = true,
  className = '',
  showProgress = false
}) => {
  const containerClasses = fullScreen
    ? 'min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden'
    : 'flex flex-col items-center justify-center p-8 relative overflow-hidden';

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-br from-pink-400/20 to-blue-600/20 rounded-full animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8">
        <LoadingSpinner size="xl" variant={variant} />

        {message && (
          <div className="text-center space-y-4">
            <p className="text-xl font-semibold text-gray-700 mb-2">{message}</p>
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {showProgress && (
          <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full animate-shimmer"></div>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingButton = ({ loading, children, variant = 'default', size = 'medium', className = '', ...props }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-10 w-10',
    large: 'h-12 w-12'
  };

  return (
    <button
      disabled={loading}
      className={`relative transition-all duration-200 ${loading ? 'cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size={size} variant={variant} />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

const LoadingCard = ({ variant = 'shimmer', className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 animate-pulse ${className}`}>
      <div className="flex space-x-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full animate-shimmer"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded animate-shimmer"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
};

export { LoadingSpinner, LoadingScreen, LoadingButton, LoadingCard };
export default LoadingScreen;
