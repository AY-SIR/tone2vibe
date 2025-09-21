import React from "react";
import Blog from "@/components/sections/blog";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResponsiveGuard } from "@/components/common/ResponsiveGuard";
import { SecurityProvider } from "@/components/common/SecurityProvider";
import { Suspense, useEffect } from "react";
import Index from "./pages/Index";
import Tool from "./pages/Tool";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import EmailConfirmed from "./pages/EmailConfirmed";

const queryClient = new QueryClient();

import { DatabaseSecurity } from "@/lib/secureDatabase";

function App() {
  useEffect(() => {
    // Initialize enhanced security measures
    DatabaseSecurity.initializeSecurityMeasures();
    
    // Additional production security
    if (import.meta.env.PROD) {
      // Disable right-click in production
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      
      // Clear console periodically in production
      setInterval(() => {
        if (typeof console.clear === 'function') {
          console.clear();
        }
      }, 30000); // Clear every 30 seconds
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ResponsiveGuard>
          <SecurityProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route 
                     path="/tool" 
                     element={
                       <ProtectedRoute>
                         <Tool />
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
                    path="/history" 
                    element={
                      <ProtectedRoute>
                        <History />
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
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/email-confirmed" element={<EmailConfirmed />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </TooltipProvider>
          </SecurityProvider>
        </ResponsiveGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
