
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WelcomePopupProps {
  onGetStarted?: () => void;
  onClose?: () => void;
}

export function WelcomePopup({ onGetStarted, onClose }: WelcomePopupProps) {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Only show if user is not logged in and hasn't seen welcome before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!user && !hasSeenWelcome) {
      setShouldShow(true);
    } else {
      setShouldShow(false);
    }
  }, [user]);

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShouldShow(false);
    onClose?.();
  };

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShouldShow(false);
    onGetStarted?.();
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full shadow-2xl border border-gray-200 bg-white animate-scale-in">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute right-2 top-2 p-1 h-auto z-10"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="h-8 w-8 text-black" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Tone2Vibe! 
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Transform any text into speech that sounds exactly like you with our
            advanced AI voice cloning technology.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div>✨ 50+ languages supported</div>
            <div>⚡ Lightning fast processing</div>
          </div>
          <div className="text-sm text-red-500">Your data is secure & private</div>
          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={handleGetStarted}
              className="flex-1 bg-black hover:bg-gray-800 text-white"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="border-gray-300 hover:bg-gray-50"
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
