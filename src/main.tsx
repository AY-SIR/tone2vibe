import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import EmailConfirmation from "./pages/EmailConfirmation";

// Mount React App
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// ✅ Register Service Worker only once (safe for production)
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // Check if already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration("/sw/serviceWorker.js");

      if (!existingRegistration) {
        const registration = await navigator.serviceWorker.register("/sw/serviceWorker.js", {
          scope: "/",
        });
        console.log("[SW] Registered successfully:", registration);
      } else {
        console.log("[SW] Already registered:", existingRegistration);
      }
    } catch (error) {
      console.error("[SW] Registration failed:", error);
    }
  });
}
