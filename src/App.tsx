import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
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
import Maintenance from "@/pages/Maintenance";
import { EmailConfirmation } from "@/pages/EmailConfirmation";
import { ResetPassword } from "@/pages/ResetPassword";
import { supabase } from "@/integrations/supabase/client";

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
  const { planExpiryActive, loading: authLoading } = useAuth();
  const { isOffline, statusChecked } = useOfflineDetection();
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean | null>(null);

  // Check maintenance status
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { data } = await supabase
          .from("maintenance")
          .select("is_enabled")
          .single();
        
        setIsMaintenanceMode(data?.is_enabled ?? false);
      } catch {
        setIsMaintenanceMode(false);
      }
    };

    checkMaintenance();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("maintenance-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "maintenance",
        },
        (payload) => {
          setIsMaintenanceMode(payload.new.is_enabled);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load cookie consent from localStorage
  useEffect(() => {
    try {
      const consent = localStorage.getItem("cookie-consent");
      setCookieConsent(consent);
    } catch {
      setCookieConsent(null);
    }
  }, []);

  // Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Show maintenance page if maintenance mode is enabled
  if (isMaintenanceMode === true) {
    return <Maintenance />;
  }

  // Show offline page if user is offline
  if (statusChecked && isOffline) {
    return <Offline />;
  }

  // Cookie consent handlers
  const handleCookieAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setCookieConsent("accepted");
  };

  const handleCookieDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setCookieConsent("declined");
  };

  // Only show WordLimitPopup after auth is loaded
  const shouldShowWordLimitPopup = planExpiryActive && !authLoading;

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

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global UI Components */}
      {!cookieConsent && (
        <CookieConsent
          onAccept={handleCookieAccept}
          onDecline={handleCookieDecline}
        />
      )}

      {shouldShowWordLimitPopup && <WordLimitPopup planExpiryActive={true} />}

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