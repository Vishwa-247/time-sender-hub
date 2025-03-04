
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from "@/components/ui/sonner"
import App from './App.tsx'
import './index.css'

// Create a function to initialize the theme and accent color from localStorage
const initializeTheme = () => {
  // Check for stored accent color and apply it
  const storedColor = localStorage.getItem('accentColor');
  if (storedColor) {
    try {
      // Convert hex to HSL values
      const r = parseInt(storedColor.substr(1, 2), 16) / 255;
      const g = parseInt(storedColor.substr(3, 2), 16) / 255;
      const b = parseInt(storedColor.substr(5, 2), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: h = 0;
        }
        h /= 6;
      }

      const hue = Math.round(h * 360);
      const saturation = Math.round(s * 100);
      const lightness = Math.round(l * 100);
      
      // Update CSS variables
      document.documentElement.style.setProperty('--primary', `${hue} ${saturation}% ${lightness}%`);
      document.documentElement.style.setProperty('--accent', `${hue} ${saturation}% ${lightness}%`);
    } catch (e) {
      console.error("Error applying stored accent color:", e);
    }
  }
};

// Initialize theme before rendering
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
