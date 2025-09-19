import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-muted",
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Pre-built skeleton components
export const TextSkeleton = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        className={cn(
          "h-4",
          i === lines - 1 ? "w-3/4" : "w-full"
        )} 
      />
    ))}
  </div>
);

export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("p-6 space-y-4", className)}>
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
    </div>
    <TextSkeleton lines={2} />
    <div className="flex space-x-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>
      </div>

      <div className="space-y-8">
        {/* Profile Card Skeleton */}
        <div className="border-0 shadow-lg bg-card/50 backdrop-blur-sm rounded-lg">
          <div className="p-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="h-6 w-16 mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Form Skeleton */}
        <div className="border-0 shadow-lg bg-card/50 backdrop-blur-sm rounded-lg">
          <div className="p-6">
            <div className="mb-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>

        {/* Plan Skeleton */}
        <div className="border-0 shadow-lg bg-card/50 backdrop-blur-sm rounded-lg">
          <div className="p-6">
            <div className="mb-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);