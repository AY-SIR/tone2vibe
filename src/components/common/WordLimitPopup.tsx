import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

interface WordLimitPopupProps {
  planExpiryActive?: boolean; // Prop to check if plan expiry popup is active
}

export const WordLimitPopup = ({ planExpiryActive = false }: WordLimitPopupProps) => {
  const { profile } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile || planExpiryActive || hasShown) return;

    // Check if popup was already shown in this session
    const popupShownKey = `word_limit_popup_shown_${profile.user_id}`;
    const lastShown = sessionStorage.getItem(popupShownKey);
    
    if (lastShown) return; // Don't show if already shown in this session

    const planWordsRemaining = Math.max(0, profile.words_limit - profile.plan_words_used);
    const totalAvailable = planWordsRemaining + profile.word_balance;

    // Show popup when total words remaining is less than 100 or out of words
    if (totalAvailable < 100) {
      setShowPopup(true);
      setHasShown(true);
      sessionStorage.setItem(popupShownKey, Date.now().toString());
    }
  }, [profile, planExpiryActive, hasShown]);

  if (!profile || !showPopup) return null;

  const planWordsRemaining = Math.max(0, profile.words_limit - profile.plan_words_used);
  const totalAvailable = planWordsRemaining + profile.word_balance;
  const isOutOfWords = totalAvailable <= 0;

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
<DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-xl p-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${isOutOfWords ? 'text-red-600' : 'text-yellow-600'}`} />
            <DialogTitle>
              {isOutOfWords ? "Out of Words" : "Low Word Balance"}
            </DialogTitle>
          </div>
<DialogDescription asChild>
  <div className="pt-3">
    {isOutOfWords ? (
      <div className="space-y-2">
        <p className="font-semibold text-red-600">
          You have run out of words!
        </p>
        <p className="text-sm">
          You need to purchase more words or upgrade your plan to continue generating voices.
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        <p className="font-semibold text-yellow-600">
          You have only {totalAvailable} words remaining!
        </p>
        <p className="text-sm">
          Consider purchasing more words or upgrading your plan to continue uninterrupted service.
        </p>
        <div className="mt-3 p-3 bg-muted rounded-md">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Plan Words:</span>
              <span className="font-medium">{planWordsRemaining}</span>
            </div>
            <div className="flex justify-between">
              <span>Purchased Words:</span>
              <span className="font-medium">{profile.word_balance}</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPopup(false)}
            className="w-full sm:w-auto"
          >
            Continue Anyway
          </Button>
          <Button
            onClick={() => {
              setShowPopup(false);
              navigate("/payment");
            }}
            className="w-full sm:w-auto"
          >
            {isOutOfWords ? "Purchase Words" : "View Plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};