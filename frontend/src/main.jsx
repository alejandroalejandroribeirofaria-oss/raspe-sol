import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { WalletProvider } from './wallet/WalletContext.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);

