import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import { EmailConfirmation } from './pages/EmailConfirmation';

// Minimal Service Worker registration (no Vite PWA)
if ('serviceWorker' in navigator) {
  // Register ASAP for better coverage
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Mount React App
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
