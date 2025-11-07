import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResponsiveGuard } from "@/components/common/ResponsiveGuard";
import { WordLimitPopup } from "./components/common/WordLimitPopup";
import { CookieConsent } from "./components/common/CookieConsent";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { supabase } from "@/integrations/supabase/client";

// Normal imports
import Index from "./pages/Index";
import Tool from "./pages/Tool";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Offline from "./pages/Offline";
import { EmailConfirmation } from "./pages/EmailConfirmation";
import { ResetPassword } from "./pages/ResetPassword";
import Verify2FA from "./pages/Verify2FA";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { planExpiryActive, user, session } = useAuth();
  const { isOffline, statusChecked } = useOfflineDetection();
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check cookie consent on mount
  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    setCookieConsent(consent);
  }, []);

  // Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const handleCookieAccept = () => {
    setCookieConsent("accepted");
  };

  const handleCookieDecline = () => {
    setCookieConsent("declined");
  };

  // Proactive client 2FA redirect on public routes (smooth, no flash)
  useEffect(() => {
    if (!user) return;
    const tokenPart = session?.access_token ? session.access_token.slice(0, 16) : 'no-token';
    const verifiedKey = `2fa_verified:${user.id}:${tokenPart}`;
    const isVerified = typeof window !== 'undefined' && sessionStorage.getItem(verifiedKey) === 'true';
    if (isVerified) return;

    const check = async () => {
      const { data } = await supabase
        .from('user_2fa_settings')
        .select('enabled')
        .eq('user_id', user.id)
        .single();
      if (data?.enabled && location.pathname !== '/verify-2fa') {
        navigate(`/verify-2fa?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      }
    };
    check();
  }, [user?.id, session?.access_token, location.pathname, location.search, navigate]);

  // Show offline screen when offline (only after initial status check)
  if (statusChecked && isOffline) {
    return <Offline />;
  }

  // Render app normally when online
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/tool" element={<ProtectedRoute><Tool /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/payment-failed" element={<ProtectedRoute><PaymentFailed /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-2fa" element={<Verify2FA />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {!cookieConsent && (
        <CookieConsent
          onAccept={handleCookieAccept}
          onDecline={handleCookieDecline}
        />
      )}

      <WordLimitPopup planExpiryActive={planExpiryActive} />
      <Toaster />
      <Sonner />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <ResponsiveGuard>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ResponsiveGuard>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
