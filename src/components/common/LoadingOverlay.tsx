import { useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  isSuccess?: boolean;
}

export function LoadingOverlay({
  isVisible,
  message = "Processing...",
  isSuccess = false
}: LoadingOverlayProps) {
  // ✅ Disable body scroll when overlay is visible
  useEffect(() => {
    if (isVisible) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Disable scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        // Re-enable scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      style={{
        pointerEvents: 'all',
        touchAction: 'none', // Prevents touch scrolling on mobile
        overscrollBehavior: 'none' // Prevents overscroll
      }}
    >
      <div
        className={`rounded-lg p-4 sm:p-6 lg:p-8 shadow-2xl flex flex-col items-center space-y-3 sm:space-y-4 max-w-xs sm:max-w-sm mx-4 animate-scale-in transition-all duration-300 ${
          isSuccess ? 'bg-white' : 'bg-white'
        }`}
      >
        {/* Icon - Conditional based on success */}
        {isSuccess ? (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <div className="absolute inset-0 rounded-full bg-white animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
            </div>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
        )}

        {/* Message */}
        <div className="text-center">
          <p className={`font-medium text-sm sm:text-base ${
            isSuccess ? 'text-green-900' : 'text-gray-900'
          }`}>
            {message}
          </p>
          <p className={`text-xs sm:text-sm mt-1 ${
            isSuccess ? 'text-gray-500' : 'text-gray-500'
          }`}>
            {isSuccess
              ? 'Redirecting to download page...'
              : 'Please wait while we process your request...'}
          </p>
        </div>
      </div>
    </div>
  );
}