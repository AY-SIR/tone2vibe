import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto relative">
            {/* Static outer circle */}
  <div className="absolute inset-0 border-4 border-black rounded-full"></div>

  {/* Spinning loader */}
  <div className="absolute inset-0 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
</div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Refreshing Experience
            </h2>

          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-800">
              ✨ <strong>Live Updates:</strong> Real-time analytics, word balance tracking, and seamless refresh experience
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};