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



if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw/serviceWorker.js')
      .then(reg => console.log("SW registered", reg))
      .catch(err => console.error("SW registration failed:", err));
  });
}
