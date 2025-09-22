
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Cookie, CheckCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Cookies = () => {
  const navigate = useNavigate();
  const [cookieStatus, setCookieStatus] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const status = localStorage.getItem('cookie-consent');
    setCookieStatus(status);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Listen for cookie consent updates from popup
    const handleConsentUpdate = (e: CustomEvent) => {
      const status = localStorage.getItem('cookie-consent');
      setCookieStatus(status);
      if (e.detail.source === 'popup') {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
    };
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setCookieStatus('accepted');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    
    // Trigger custom event for proper synchronization
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
      detail: { status: 'accepted', source: 'page' } 
    }));
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setCookieStatus('declined');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    
    // Trigger custom event for proper synchronization
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
      detail: { status: 'declined', source: 'page' } 
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Alert */}
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your cookie preferences have been updated successfully.
            </AlertDescription>
          </Alert>
        )}

        {/* Cookie Preferences Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cookie className="h-5 w-5 text-blue-600" />
              <span>Cookie Preferences</span>
            </CardTitle>
            <CardDescription>
              Current status: {cookieStatus ? (
                <span className={`font-medium ${
                  cookieStatus === 'accepted' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {cookieStatus === 'accepted' ? 'Accepted' : 'Declined'}
                </span>
              ) : (
                <span className="text-gray-600">Not set</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              You can change your cookie preferences at any time using the buttons below.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={handleAcceptCookies}
                className="bg-black hover:bg-gray-800 text-white flex items-center justify-center text-sm px-4 py-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept All
              </Button>

              <Button
                variant="outline"
                onClick={handleDeclineCookies}
                className="border-gray-300 hover:bg-gray-50 flex items-center justify-center text-sm px-4 py-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>

            {cookieStatus === 'declined' && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800">
                  <strong>Note:</strong> With cookies declined, some features including login and user preferences may not work properly.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-lg text-gray-600">
            Understanding how we use cookies to improve your experience
          </p>
        </div>

        {/* Rest of content */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>What Are Cookies?</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                Cookies are small text files that are stored on your computer or mobile device when you visit a website. 
                They help websites remember information about your visit, which can make your next visit easier and the site more useful to you.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Cookies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Essential Cookies</h3>
                  <p className="text-gray-600">
                    These cookies are necessary for the website to function properly. They enable basic functions like 
                    page navigation, access to secure areas, and user authentication.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Analytics Cookies</h3>
                  <p className="text-gray-600">
                    We use analytics cookies to understand how visitors interact with our website. This helps us 
                    improve our site's performance and user experience.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Preference Cookies</h3>
                  <p className="text-gray-600">
                    These cookies remember your preferences and settings to provide you with a personalized experience 
                    when you return to our website.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managing Your Cookie Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You can control cookies through your browser settings. Most browsers allow you to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>View what cookies are stored on your device</li>
                <li>Delete cookies individually or all at once</li>
                <li>Block cookies from specific sites</li>
                <li>Block all cookies from being set</li>
                <li>Delete all cookies when you close your browser</li>
              </ul>
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertDescription className="text-yellow-800">
                  Please note that disabling cookies may affect the functionality of our website and limit your user experience.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                If you have any questions about our cookie policy or how we handle your data, please don't hesitate to contact us.
              </p>
              <Button variant="outline" onClick={() => navigate('/contact')}>
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
