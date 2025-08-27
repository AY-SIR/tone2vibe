
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Loader2 className={cn('animate-spin text-gray-900', sizeClasses[size], className)} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

export function FullPageLoader({ text = "Loading Tone2Vibe..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg border">
        <LoadingSpinner size="lg" />
        <p className="text-gray-700 font-medium">{text}</p>
      </div>
    </div>
  );
}

export function StepLoader({ currentStep, totalSteps, stepName }: { 
  currentStep: number; 
  totalSteps: number; 
  stepName: string; 
}) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin text-gray-900" />
        <span className="text-sm font-medium text-gray-700">Processing {stepName}...</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gray-900 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-center text-xs text-gray-500">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
