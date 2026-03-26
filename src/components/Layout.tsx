import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, Settings, Search, KeyRound, History, Building, CreditCard, ShieldAlert, AlertTriangle, DollarSign, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import axios from 'axios';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      axios.get('/api/billing/plans')
        .then(res => setExpirationDate(res.data.expiration_date))
        .catch(() => {});
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
    { path: '/users', label: 'Usuários', icon: Users, roles: ['admin'] },
    { path: '/groups', label: 'Assinantes', icon: Building, roles: ['superadmin'] },
    { path: '/system-settings', label: 'Config. Sistema', icon: ShieldAlert, roles: ['superadmin'] },
    { path: '/payments', label: 'Pagamentos', icon: DollarSign, roles: ['superadmin'] },
    { path: '/database', label: 'Banco de Dados', icon: Database, roles: ['superadmin'] },
    { path: '/billing', label: 'Assinatura', icon: CreditCard, roles: ['superadmin', 'admin'] },
    { path: '/change-password', label: 'Alterar Senha', icon: KeyRound, roles: ['superadmin', 'admin', 'user'] },
  ];

  const calculateRemainingDays = () => {
    if (!expirationDate) return null;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = calculateRemainingDays();

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
          
          {remainingDays !== null && (
            <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Licença Restante</p>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold",
                  remainingDays > 5 ? "text-emerald-400" : remainingDays > 0 ? "text-amber-400" : "text-red-400"
                )}>
                  {remainingDays > 0 ? `${remainingDays} dias` : 'Expirada'}
                </span>
                {remainingDays === 1 && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                )}
              </div>
              {remainingDays === 1 && (
                <p className="text-xs text-amber-400 mt-1 font-medium">Sua licença expira amanhã!</p>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            if (!user || !item.roles.includes(user.role)) return null;
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
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
