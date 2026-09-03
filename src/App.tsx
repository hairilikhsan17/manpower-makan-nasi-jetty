import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout, { type PageKey } from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import InputHarianPage from '@/pages/InputHarianPage';
import HistoryPage from '@/pages/HistoryPage';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import HakAksesPage from '@/pages/HakAksesPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('input');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Layout current={page} onNavigate={setPage}>
      {page === 'input' && <InputHarianPage />}
      {page === 'history' && <HistoryPage />}
      {page === 'dashboard' && <DashboardPage />}
      {page === 'settings' && <SettingsPage />}
      {page === 'hak-akses' && <HakAksesPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
