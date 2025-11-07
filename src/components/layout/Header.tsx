import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MobileWordCounter } from "./MobileWordCounter";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { AuthModal } from "@/components/auth/AuthModal";
import { Mic } from "lucide-react";

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, profile } = useAuth();
  const isLoggedIn = user && user.id !== "guest";

const navigate = useNavigate();
const [params] = useSearchParams();

// Open Auth modal when query says so or when an event is fired
useEffect(() => {
  if (params.get('auth') === 'open') {
    setShowAuthModal(true);
  }
}, [params]);

useEffect(() => {
  const handler = (e: any) => {
    setShowAuthModal(true);
  };
  window.addEventListener('auth:open', handler);
  return () => window.removeEventListener('auth:open', handler);
}, []);

  return (
    <>
      <header className="bg-white shadow-sm border border-gray-200 rounded-xl mx-4 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">

            {/* Logo - use navigate on click */}
            <div
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
                <Mic className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent">
                Tone2Vibe
              </span>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isLoggedIn && profile && (
                <div className="hidden min-[360px]:flex items-center space-x-2">
  <MobileWordCounter />
</div>

              )}

              {isLoggedIn ? (
                <ProfileDropdown />
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
};

export default Header;
