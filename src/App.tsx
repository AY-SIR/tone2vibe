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
import { WordLimitPopup } from "@/components/common/WordLimitPopup";
import { CookieConsent } from "@/components/common/CookieConsent";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";

// Pages
import Index from "@/pages/Index";
import Tool from "@/pages/Tool";
import Payment from "@/pages/Payment";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailed from "@/pages/PaymentFailed";
import History from "@/pages/History";
import Analytics from "@/pages/Analytics";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Contact from "@/pages/Contact";
import Cookies from "@/pages/Cookies";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Offline from "@/pages/Offline";
import { EmailConfirmation } from "@/pages/EmailConfirmation";
import { ResetPassword } from "@/pages/ResetPassword";
import Verify2FA from "@/pages/Verify2FA";

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
  const { planExpiryActive } = useAuth();
  const { isOffline, statusChecked } = useOfflineDetection();
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);

  // ✅ Load cookie consent safely
  useEffect(() => {
    try {
      const consent = localStorage.getItem("cookie-consent");
      setCookieConsent(consent);
    } catch {
      setCookieConsent(null);
    }
  }, []);

  // ✅ Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // ✅ Offline detection (wait for status check)
  if (statusChecked && isOffline) {
    return <Offline />;
  }

  // ✅ Cookie handlers
  const handleCookieAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setCookieConsent("accepted");
  };

  const handleCookieDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setCookieConsent("declined");
  };

  return (
    <>
      <Routes>
        {/*  Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-2fa" element={<Verify2FA />} />

        {/*  Protected routes */}
        <Route
          path="/tool"
          element={
            <ProtectedRoute>
              <Tool />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-failed"
          element={
            <ProtectedRoute>
              <PaymentFailed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        {/*  Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global UI Components */}
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
