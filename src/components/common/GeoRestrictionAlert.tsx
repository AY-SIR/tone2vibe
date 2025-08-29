import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { GeoRestrictionService } from '@/services/geoRestrictionService';

export function GeoRestrictionAlert() {
  const [geoRestriction, setGeoRestriction] = useState<{
    isAllowed: boolean;
    message: string;
    countryName?: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkGeoRestrictions = async () => {
      try {
        const restriction = await GeoRestrictionService.checkCountryAccess();
        setGeoRestriction(restriction);
      } catch (error) {
        console.error('Geo restriction check failed:', error);
        // Allow access on error
        setGeoRestriction({ isAllowed: true, message: '' });
      } finally {
        setIsChecking(false);
      }
    };

    checkGeoRestrictions();
  }, []);

  if (isChecking || !geoRestriction || geoRestriction.isAllowed) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Service Unavailable</AlertTitle>
      <AlertDescription>
        {geoRestriction.message}
        {geoRestriction.countryName && (
          <div className="mt-2 text-sm">
            We apologize for any inconvenience. Our service is currently not available in {geoRestriction.countryName}.
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}