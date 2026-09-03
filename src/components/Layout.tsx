import { type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UtensilsCrossed, LayoutDashboard, CalendarDays, ClipboardList, Settings, LogOut, ShieldCheck } from 'lucide-react';

export type PageKey = 'input' | 'history' | 'dashboard' | 'settings' | 'hak-akses';

interface LayoutProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

const navItems: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'input', label: 'Input Harian', icon: ClipboardList },
  { key: 'history', label: 'History / Kalender', icon: CalendarDays },
  { key: 'dashboard', label: 'Dashboard / Rekap', icon: LayoutDashboard },
  { key: 'settings', label: 'Pengaturan Variabel', icon: Settings },
  { key: 'hak-akses', label: 'Hak Akses', icon: ShieldCheck },
];

export default function Layout({ current, onNavigate, children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-30 hidden md:flex">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Manpower</p>
            <p className="text-xs text-slate-400 leading-tight">Makan Nasi Jetty</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                current === key
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="mb-2">
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {profile && (
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                profile.role === 'super_admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
              }`}>
                {profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            )}
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Manpower Makan Nasi</span>
          </div>
          <button onClick={signOut} className="text-slate-400">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex border-t border-slate-800 overflow-x-auto">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`flex-1 min-w-fit flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all ${
                current === key ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-28 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
