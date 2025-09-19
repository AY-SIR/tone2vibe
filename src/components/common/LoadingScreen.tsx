import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-4 space-y-6">
      {/* Header / Title placeholder */}
      <div className="w-3/4 h-8 bg-gray-200 rounded animate-pulse"></div>

      {/* Subheader / subtitle placeholder */}
      <div className="w-1/2 h-6 bg-gray-200 rounded animate-pulse"></div>

      {/* Main content placeholders */}
      <div className="w-full max-w-4xl space-y-4">
        <div className="w-full h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-5/6 h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-2/3 h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-4/5 h-6 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Card placeholders */}
      <div className="flex flex-wrap gap-4 justify-center mt-6 w-full max-w-4xl">
        <div className="w-60 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="w-60 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="w-60 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
};
