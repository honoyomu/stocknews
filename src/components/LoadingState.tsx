import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 animate-fadeIn px-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-neutral-200 border-t-primary-600 rounded-full animate-spin mb-4 sm:mb-6"></div>
      <h3 className="text-lg sm:text-xl font-medium text-neutral-800 mb-2 text-center">Analyzing Stock News</h3>
      <p className="text-sm sm:text-base text-neutral-500 text-center max-w-sm sm:max-w-md">
        Collecting news articles, analyzing sentiment, and preparing insights.
        This may take a moment...
      </p>
    </div>
  );
};

export default LoadingState;