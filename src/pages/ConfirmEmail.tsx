import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      confirmEmail();
    } else {
      setStatus('error');
      setMessage('Token de confirmação não encontrado.');
    }
  }, [token]);

  const confirmEmail = async () => {
    try {
      const res = await axios.get(`/api/auth/confirm/${token}`);
      setStatus('success');
      setMessage(res.data.message);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Erro ao confirmar e-mail.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-slate-900">Confirmando seu e-mail...</h1>
            <p className="text-slate-500">Aguarde um momento enquanto validamos seu cadastro.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">E-mail Confirmado!</h1>
            <p className="text-slate-600">{message}</p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-block w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Ir para o Login
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Erro na Confirmação</h1>
            <p className="text-slate-600">{message}</p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-block w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
                Voltar para o Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
