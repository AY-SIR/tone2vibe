
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Mic, FastForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function StickyHeader() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWordInfo, setShowWordInfo] = useState(false);
  const isMobile = useIsMobile();

  const getWordCountDisplay = () => {
    if (!profile) return '';

    // Show only total available words (plan remaining + purchased)
    const planWordsUsed = profile.plan_words_used || 0;
    const planLimit = profile.words_limit || 0;
    const purchasedWords = profile.word_balance || 0;
    const planWordsRemaining = Math.max(0, planLimit - planWordsUsed);
    const totalAvailable = planWordsRemaining + purchasedWords;

    return `${totalAvailable.toLocaleString()} left`;
  };

  const getRemainingWords = () => {
    if (!profile) return 0;
    const planWordsUsed = profile.plan_words_used || 0;
    const planLimit = profile.words_limit || 0;
    const purchasedWords = profile.word_balance || 0;
    const planWordsRemaining = Math.max(0, planLimit - planWordsUsed);
    return planWordsRemaining + purchasedWords;
  };

  const handleWordInfoClick = () => {
    setShowWordInfo(!showWordInfo);
    // Auto hide after 3 seconds
    if (!showWordInfo) {
      setTimeout(() => setShowWordInfo(false), 3000);
    }
  };

  // Close word info when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showWordInfo) {
        setShowWordInfo(false);
      }
    };

    if (showWordInfo) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showWordInfo]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 p-0 hover:bg-transparent"
          >
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
 <img
    src="/favicon.png"
    alt="icon"
    className="w-4 h-4"
  />            </div>
            <span className="font-bold text-lg hidden sm:inline">Tone2Vibe</span>
          </Button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-sm">
            Home
          </Button>
          <Button variant="ghost" onClick={() => navigate('/tool')} className="text-sm">
            Voice Tool
          </Button>
          {user && (
            <Button variant="ghost" onClick={() => navigate('/history')} className="text-sm">
              History
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/contact')} className="text-sm">
            Contact
          </Button>
        </nav>

        {/* Right side - Auth & User Menu */}
        <div className="flex items-center space-x-2">
          {/* Fast-forward icon for mobile word count */}
          {user && profile && isMobile && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordInfoClick();
                }}
                className="p-2 hover:bg-gray-100"
              >
                <FastForward className="h-4 w-4 text-gray-600" />
              </Button>

              {/* Word info popup for mobile */}
              {showWordInfo && (
                <div
                  className="absolute top-12 right-0 bg-white border rounded-lg shadow-lg p-3 min-w-[200px] z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-sm space-y-2">
                  {/* Only show purchased words breakdown if user has any */}
                  {(profile.word_balance || 0) > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan ({profile.plan.toUpperCase()}):</span>
                        <span className="font-medium">
                          {(profile.plan_words_used || 0).toLocaleString()}/{(profile.words_limit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purchased:</span>
                        <span className="font-medium text-blue-600">
                          {(profile.word_balance || 0).toLocaleString()} (never expire)
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 font-medium">Total Available:</span>
                        <span className="font-bold text-green-600">
                          {getRemainingWords().toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan ({profile.plan.toUpperCase()}):</span>
                        <span className="font-medium">
                          {(profile.plan_words_used || 0).toLocaleString()}/{(profile.words_limit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 font-medium">Available:</span>
                        <span className="font-bold text-green-600">
                          {getRemainingWords().toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Word count in header (desktop only) */}
          {user && profile && !isMobile && (
            <Badge variant="outline" className="text-xs">
              <FastForward className="h-3 w-3 mr-1" />
              {getWordCountDisplay()} words
            </Badge>
          )}

          {user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/auth')} className="text-sm">
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')} size="sm" className="text-sm bg-black hover:bg-gray-800">
                Get Started
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-2 space-y-1">
            <Button
              variant="ghost"
              onClick={() => {
                navigate('/');
                setIsMenuOpen(false);
              }}
              className="w-full justify-start text-sm"
            >
              Home
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                navigate('/tool');
                setIsMenuOpen(false);
              }}
              className="w-full justify-start text-sm"
            >
              Voice Tool
            </Button>
            {user && (
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/history');
                  setIsMenuOpen(false);
                }}
                className="w-full justify-start text-sm"
              >
                History
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                navigate('/contact');
                setIsMenuOpen(false);
              }}
              className="w-full justify-start text-sm"
            >
              Contact
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
