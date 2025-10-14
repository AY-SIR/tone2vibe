
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import EmailConfirmation from "./pages/EmailConfirmation";


// Entry point
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



// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw/serviceWorker.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.error("SW registration failed:", err));
  });
}
