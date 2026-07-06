import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UpdateProvider } from './pwa/UpdateContext';
import { SettingsProvider } from './state/SettingsContext';
import { ThemeProvider } from './theme/ThemeContext';
import { soundEngine } from './audio/soundEngine';
import './index.css';

soundEngine.installUnlock();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <UpdateProvider>
        <SettingsProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </SettingsProvider>
      </UpdateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
