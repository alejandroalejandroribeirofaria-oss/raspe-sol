import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext';
import { WalletProvider } from './wallet/WalletProvider.jsx';
import { ChatProvider } from './chat/ChatProvider.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles/index.css';

const isAdminRoute = window.location.pathname.startsWith('/admin');

const root = (
  <React.StrictMode>
    {isAdminRoute ? (
      <AdminApp />
    ) : (
      <I18nProvider>
        <WalletProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </WalletProvider>
      </I18nProvider>
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')).render(root);
