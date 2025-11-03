
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResponsiveGuard } from "@/components/common/ResponsiveGuard";
import { WordLimitPopup } from "./components/common/WordLimitPopup";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { RefreshCw } from "lucide-react"; // <-- Import the loader icon

// --- Normal imports (no lazy) ---
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
import {EmailConfirmation} from "./pages/EmailConfirmation";
import {ResetPassword }from "./pages/ResetPassword";

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
  const { planExpiryActive, user } = useAuth();
  const { isOffline, statusChecked } = useOfflineDetection();

  // Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // --- 1. RENDER LOADER ---
  // Wait for the hook to perform its *first* check.
  // This prevents the main app from flashing on-screen if offline.
  if (!statusChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Checking Connection</h1>
            <p className="text-muted-foreground">Please wait a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER OFFLINE PAGE ---
  // The first check is done, and we are confirmed to be offline.
  if (isOffline) {
    return <Offline />;
  }

  // --- 3. RENDER APP ---
  // The first check is done, and we are confirmed to be online.
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
        <Route path="/offline" element={<Offline />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

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
