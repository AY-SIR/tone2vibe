
import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function SimpleCookieAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    const consentStatus = localStorage.getItem('cookie-consent');
    
    // Don't show if already accepted or if on auth/tool pages (essential cookies allowed)
    if (!consentStatus && window.location.pathname === '/') {
      setShowAlert(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowAlert(false);
  };

  const handleViewPolicy = () => {
    navigate('/cookies');
  };

  if (!showAlert) return null;

  return (
    <div className="fixed top-4 right-4 z-[40] max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <div className="flex items-start space-x-3">
        <Cookie className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            Cookie Consent Required
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            This tool requires cookies to function properly. Please accept our cookie policy to continue.
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={handleAccept}
              size="sm"
              className="text-xs px-3 py-1 h-7"
            >
              Accept
            </Button>
            <Button
              onClick={handleViewPolicy}
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1 h-7"
            >
              View Policy
            </Button>
          </div>
        </div>
        <button
          onClick={() => setShowAlert(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
