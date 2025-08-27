
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "Processing..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 shadow-2xl flex flex-col items-center space-y-3 sm:space-y-4 max-w-xs sm:max-w-sm mx-4 animate-scale-in">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="font-medium text-gray-900 text-sm sm:text-base">{message}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Please wait while we process your request...</p>
        </div>
      </div>
    </div>
  );
}
