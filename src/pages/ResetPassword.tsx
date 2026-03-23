import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    if (password.length < 6) {
      return setError('A senha deve ter pelo menos 6 caracteres.');
    }
    if (!token) {
      return setError('Token de recuperação inválido ou ausente.');
    }

    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Senha Redefinida!</h1>
          <p className="text-slate-600 mb-6">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
          </p>
          <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-800">
            Ir para o login agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Nova Senha</h1>
          <p className="text-slate-500 mt-2">
            Crie uma nova senha para sua conta.
          </p>
        </div>

        {!token ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Link Inválido</h3>
            <p className="text-red-600 text-sm mb-4">
              O link de recuperação de senha é inválido ou expirou.
            </p>
            <Link to="/recover-password" className="text-indigo-600 font-semibold hover:text-indigo-800">
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nova Senha</label>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Alterando...' : 'Redefinir Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
