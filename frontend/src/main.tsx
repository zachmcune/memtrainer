import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UpdateProvider } from './pwa/UpdateContext';
import { SettingsProvider } from './state/SettingsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <UpdateProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </UpdateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
