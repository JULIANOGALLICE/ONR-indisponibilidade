import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, Settings, Search, KeyRound, History } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Consultas API', icon: Search, roles: ['superadmin', 'admin', 'user'] },
    { path: '/history', label: 'Histórico', icon: History, roles: ['superadmin', 'admin', 'user'] },
    { path: '/config', label: 'Configurações ONR', icon: Settings, roles: ['superadmin', 'admin'] },
    { path: '/users', label: 'Usuários', icon: Users, roles: ['superadmin', 'admin'] },
    { path: '/change-password', label: 'Alterar Senha', icon: KeyRound, roles: ['superadmin', 'admin', 'user'] },
  ];

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
