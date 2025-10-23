// IndiaOnlyAlert.tsx
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MapPin } from "lucide-react";
import { IndiaOnlyService } from '@/services/indiaOnlyService';

export function IndiaOnlyAlert({ userId }: { userId?: string }) {
  const [accessCheck, setAccessCheck] = useState<{
    isAllowed: boolean;
    message: string;
    countryName?: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const access = await IndiaOnlyService.checkIndianAccess(userId);
      setAccessCheck(access);
      setIsChecking(false);
    };
    checkAccess();
  }, [userId]);

  if (isChecking || !accessCheck || accessCheck.isAllowed) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        केवल भारत में उपलब्ध | India Only Service
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">{accessCheck.message}</p>
          {accessCheck.countryName && (
            <div className="text-sm bg-destructive/10 rounded p-2">
              <p>🇮🇳 यह सेवा केवल भारतीय उपयोगकर्ताओं के लिए है।</p>
              <p>🌍 This service is exclusively for users in India.</p>
              <p className="text-xs mt-1 opacity-80">
                Detected location: {accessCheck.countryName}
              </p>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
