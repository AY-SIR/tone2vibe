import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanExpiryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  daysUntilExpiry: number;
  plan: string;
  expiresAt: string;
  isExpired: boolean;
}

export const PlanExpiryPopup: React.FC<PlanExpiryPopupProps> = ({
  isOpen,
  onClose,
  daysUntilExpiry,
  plan,
  expiresAt,
  isExpired
}) => {
  const navigate = useNavigate();
  const [isReloading, setIsReloading] = useState(false);

  const handleClose = () => {
    // Only reload if the plan is expired
    if (isExpired) {
      setIsReloading(true);
      onClose();

      // Wait 2 seconds then reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      onClose(); // Just close, no reload
    }
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/payment');
  };

  const getIcon = () => {
    if (isExpired) {
      return <AlertTriangle className="h-8 w-8 text-destructive" />;
    }
    return <Clock className="h-8 w-8 text-warning" />;
  };

  const getTitle = () => {
    if (isExpired) {
      return 'Plan Expired';
    }
    if (daysUntilExpiry <= 1) {
      return 'Plan Expires Today';
    }
    return 'Plan Expiring Soon';
  };

  const getDescription = () => {
    if (isExpired) {
      return `Your ${plan} plan expired on ${new Date(expiresAt).toLocaleDateString()}. Renew your subscription to continue enjoying premium features.`;
    }
    if (daysUntilExpiry <= 1) {
      return `Your ${plan} plan expires today. Don't lose access to your premium features - renew now!`;
    }
    return `Your ${plan} plan expires in ${daysUntilExpiry} days (${new Date(expiresAt).toLocaleDateString()}). Renew now to avoid any interruption.`;
  };

  const getActionText = () => {
    return isExpired ? 'Renew Plan' : 'Extend Plan';
  };

  // Loading overlay when expired plan triggers refresh
  if (isReloading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
          <p className="text-white text-lg font-medium">Refreshing...</p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90%] max-w-md mx-auto rounded-2xl px-4 sm:px-6 py-4">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {getIcon()}
          </div>
          <DialogTitle className="text-lg font-semibold text-center">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full bg-black text-white hover:bg-black/90"
          >
            Remind Me Later
          </Button>
        </div>

        {isExpired && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-md">
            <p className="text-xs text-destructive text-center">
              Your plan has expired and you've been moved to the free tier.
              Purchased words never expire and are still available.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
