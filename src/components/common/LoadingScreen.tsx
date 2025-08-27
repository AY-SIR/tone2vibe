import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto relative">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Refreshing Experience
            </h2>
            <p className="text-gray-600">
              Preparing everything for your next voice generation...
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              ✨ <strong>Live Updates:</strong> Real-time analytics, word balance tracking, and seamless refresh experience
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};