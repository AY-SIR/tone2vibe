import { Loader2, CheckCircle } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  isSuccess?: boolean; // ✅ Optional - default false (no breaking changes)
}

export function LoadingOverlay({
  isVisible,
  message = "Processing...",
  isSuccess = false // ✅ Default false - purani jagah kaam karegi
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      style={{ pointerEvents: 'all' }}
    >
      <div
        className={`rounded-lg p-4 sm:p-6 lg:p-8 shadow-2xl flex flex-col items-center space-y-3 sm:space-y-4 max-w-xs sm:max-w-sm mx-4 animate-scale-in transition-all duration-300 ${
          isSuccess
            ? 'bg-white'
            : 'bg-white'
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
            isSuccess ? 'text-green-700' : 'text-gray-500'
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