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

// Page imports
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
  const { planExpiryActive, user, needs2FA, checking2FA } = useAuth();
  const { isOffline, statusChecked } = useOfflineDetection();
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check cookie consent on mount
  useEffect(() => {
    try {
      const consent = localStorage.getItem("cookie-consent");
      setCookieConsent(consent);
    } catch {
      // LocalStorage may not be available
      setCookieConsent(null);
    }
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
    try {
      localStorage.setItem("cookie-consent", "accepted");
      setCookieConsent("accepted");
    } catch {
      // LocalStorage may not be available
    }
  };

  const handleCookieDecline = () => {
    try {
      localStorage.setItem("cookie-consent", "declined");
      setCookieConsent("declined");
    } catch {
      // LocalStorage may not be available
    }
  };

  // Handle 2FA redirect - centralized logic
  useEffect(() => {
    // Don't redirect if:
    // - No user logged in
    // - Still checking 2FA status
    // - Already on verify-2fa page
    // - On public pages
    if (!user || checking2FA) return;

    const publicPaths = [
      '/',
      '/privacy',
      '/terms',
      '/contact',
      '/cookies',
      '/email-confirmation',
      '/reset-password'
    ];

    if (publicPaths.includes(location.pathname)) return;
    if (location.pathname === '/verify-2fa') return;

    // If 2FA is needed and not on verification page, redirect
    if (needs2FA) {
      const currentPath = location.pathname + location.search;
      const redirectUrl = `/verify-2fa?redirect=${encodeURIComponent(currentPath)}`;
      navigate(redirectUrl, { replace: true });
    }
  }, [user, needs2FA, checking2FA, location.pathname, location.search, navigate]);

  // Show offline screen when offline (only after initial status check)
  if (statusChecked && isOffline) {
    return <Offline />;
  }

  // Render app normally when online
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-2fa" element={<Verify2FA />} />

        {/* Protected routes */}
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

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global components */}
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