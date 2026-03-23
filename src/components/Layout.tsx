import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, Settings, Search, KeyRound, History, Building, CreditCard, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      axios.get('/api/billing/plans')
        .then(res => setExpirationDate(res.data.expiration_date))
        .catch(err => console.error('Failed to fetch billing info', err));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Consultas API', icon: Search, roles: ['superadmin', 'admin', 'user'] },
    { path: '/history', label: 'Histórico', icon: History, roles: ['superadmin', 'admin', 'user'] },
    { path: '/config', label: 'Configurações ONR', icon: Settings, roles: ['superadmin', 'admin'] },
    { path: '/users', label: 'Usuários', icon: Users, roles: ['superadmin', 'admin'] },
    { path: '/groups', label: 'Assinantes', icon: Building, roles: ['superadmin'] },
    { path: '/system-settings', label: 'Config. Sistema', icon: ShieldAlert, roles: ['superadmin'] },
    { path: '/billing', label: 'Assinatura', icon: CreditCard, roles: ['superadmin', 'admin'] },
    { path: '/change-password', label: 'Alterar Senha', icon: KeyRound, roles: ['superadmin', 'admin', 'user'] },
  ];

  let remainingDays = null;
  if (expirationDate) {
    const diffTime = new Date(expirationDate).getTime() - new Date().getTime();
    remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Sistema ONR</h1>
          <p className="text-sm text-slate-400 mt-1">
            Logado como: <span className="text-emerald-400">{user?.email}</span>
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{user?.role}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            if (!user || !item.roles.includes(user.role)) return null;
            // Hide Users and Billing for superadmin as requested
            if (user.role === 'superadmin' && (item.path === '/users' || item.path === '/billing')) return null;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top bar for license warning */}
        {user?.role !== 'superadmin' && remainingDays !== null && (
          <div className={cn(
            "px-8 py-3 flex items-center justify-between text-sm font-medium",
            remainingDays <= 1 ? "bg-red-500 text-white" : 
            remainingDays <= 5 ? "bg-amber-500 text-white" : 
            "bg-white border-b border-slate-200 text-slate-600"
          )}>
            <div className="flex items-center gap-2">
              {(remainingDays <= 5) && <AlertTriangle className="w-4 h-4" />}
              <span>
                {remainingDays > 0 
                  ? `Sua licença expira em ${remainingDays} dia${remainingDays === 1 ? '' : 's'}.` 
                  : 'Sua licença expirou.'}
              </span>
            </div>
            {remainingDays <= 5 && user?.role === 'admin' && (
              <Link to="/billing" className="underline hover:text-white/80">
                Renovar agora
              </Link>
            )}
          </div>
        )}
        
        <div className="p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
