import { I18nProvider } from '../i18n/I18nContext';
import AdminDashboard from './AdminDashboard.jsx';
import '../styles/index.css';

export default function AdminApp() {
  return (
    <I18nProvider>
      <AdminDashboard />
    </I18nProvider>
  );
}

