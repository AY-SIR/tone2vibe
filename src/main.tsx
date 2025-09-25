import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import EmailConfirmation from "./pages/EmailConfirmation";
import EmailConfirmed from "./pages/EmailConfirmed";
import ResetPassword from "./pages/ResetPassword";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Separate auth provider for email confirmation routes */}
      <Routes>
        <Route path="/email-confirmation" element={
          <AuthProvider>
            <EmailConfirmation />
          </AuthProvider>
        } />
        <Route path="/email-confirmed" element={
          <AuthProvider>
            <EmailConfirmed />
          </AuthProvider>
        } />
        <Route path="/reset-password" element={
          <AuthProvider>
            <ResetPassword />
          </AuthProvider>
        } />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

        <Routes>
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
