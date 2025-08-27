
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";

interface CookieConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    console.log('Cookie consent status on load:', consent);
    
    if (!consent) {
      setIsVisible(true);
    }

    // Listen for storage changes to hide consent when updated from cookies page
    const handleStorageChange = (e: StorageEvent) => {
      console.log('Storage change detected:', e.key, e.newValue);
      if (e.key === 'cookie-consent' && e.newValue) {
        setIsVisible(false);
      }
    };

    // Listen for custom events from the cookies page
    const handleConsentUpdate = (e: CustomEvent) => {
      console.log('Cookie consent custom event:', e.detail);
      const consent = localStorage.getItem('cookie-consent');
      if (consent) {
        setIsVisible(false);
      }
    };

    // Listen for page visibility changes to recheck consent status
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const consent = localStorage.getItem('cookie-consent');
        if (consent) {
          setIsVisible(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAccept = () => {
    console.log('Accept clicked from popup');
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
    onAccept();
    
    // Dispatch custom event for better compatibility
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
      detail: { status: 'accepted', source: 'popup' } 
    }));
  };

  const handleDecline = () => {
    console.log('Decline clicked from popup');
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
    onDecline();
    
    // Dispatch custom event for better compatibility
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
      detail: { status: 'declined', source: 'popup' } 
    }));
  };

  const handleClose = () => {
    handleDecline();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4">
      <Card className="max-w-4xl mx-auto shadow-2xl border-gray-300 bg-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                We use cookies
              </h3>
              <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
                We use cookies to enhance your experience, provide personalized content, and analyze our traffic. 
                By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or 
                learn more in our{" "}
                <a href="/cookies" className="text-black underline hover:text-gray-700">
                  Cookie Policy
                </a>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none bg-black hover:bg-gray-800 text-white border-black"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDecline}
                  className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Decline
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
