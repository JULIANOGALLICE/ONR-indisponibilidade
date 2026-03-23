import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle } from 'lucide-react';

export function Config() {
  const [config, setConfig] = useState({
    client_id: '',
    client_secret: '',
    environment: 'stg',
    cpf_usuario: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/config');
      if (res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      setError('Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post('/api/config', config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Configurações ONR</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Credenciais da API</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure as chaves de acesso para integração com o ONR (CNIB 2.0).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Configurações salvas com sucesso!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">ONR Client ID</label>
              <input
                type="text"
                value={config.client_id || ''}
                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder="Ex: 12345678-abcd-..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">ONR Client Secret</label>
              <input
                type="password"
                value={config.client_secret || ''}
                onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder="••••••••••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ambiente</label>
              <select
                value={config.environment || 'stg'}
                onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="stg">Desenvolvimento (STG)</option>
                <option value="prod">Produção</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF do Usuário (Padrão)</label>
              <input
                type="text"
                value={config.cpf_usuario || ''}
                onChange={(e) => setConfig({ ...config, cpf_usuario: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Apenas números"
              />
              <p className="text-xs text-slate-500 mt-1">Enviado no payload das requisições.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
