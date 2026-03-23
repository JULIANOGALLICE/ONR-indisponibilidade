import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, RefreshCw } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResend(false);
    setResendSuccess('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao fazer login';
      setError(errorMessage);
      if (errorMessage.includes('confirme seu e-mail')) {
        setShowResend(true);
      }
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResendSuccess('');
    try {
      await axios.post('/api/auth/resend-confirmation', { 
        email,
        appUrl: window.location.origin
      });
      setResendSuccess('E-mail de confirmação reenviado com sucesso. Verifique sua caixa de entrada.');
      setShowResend(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao reenviar e-mail.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Sistema ONR</h1>
          <p className="text-slate-500 mt-2">Faça login para acessar o sistema</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex flex-col gap-2">
            <span>{error}</span>
            {showResend && (
              <button 
                onClick={handleResend}
                disabled={resending}
                className="self-start flex items-center gap-1 text-xs font-semibold bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
                {resending ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
              </button>
            )}
          </div>
        )}

        {resendSuccess && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-6 text-sm">
            {resendSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">Senha</label>
              <a href="/recover-password" className="text-sm text-indigo-600 hover:text-indigo-800">
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Ainda não tem uma conta?{' '}
          <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-800">
            Cadastre-se agora
          </Link>
        </div>
      </div>
    </div>
  );
}
