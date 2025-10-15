import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ResponsiveGuardProps {
  children: React.ReactNode;
}

export const ResponsiveGuard: React.FC<ResponsiveGuardProps> = ({ children }) => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If offline, always render children (Offline component)
  if (!isOnline) {
    return <>{children}</>;
  }

  // If online but screen too small, show guard message
  if (screenWidth < 320) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <Card className="max-w-sm w-full shadow-lg rounded-2xl">
          <CardContent className="p-6 text-center space-y-5">
            <div className="flex justify-center space-x-5">
              <div className="p-4 bg-gray-100 rounded-full shadow-sm">
                <Smartphone className="h-7 w-7 text-gray-500" />
              </div>
              <div className="p-4 bg-indigo-100 rounded-full shadow-sm">
                <Monitor className="h-7 w-7 text-indigo-700" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Use a Larger Screen
              </h2>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                For the best experience, please use a desktop or tablet (minimum width 320px).
              </p>
            </div>

            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-sm text-indigo-800 font-medium">
                <span className="font-semibold">Current screen:</span> {screenWidth}px <br />
                <span className="font-semibold">Minimum required:</span> 320px
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};